import { randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { UserManagementError } from "./user-policy";

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  revision: true,
  deactivated_at: true,
  image: true,
  created_at: true,
  updated_at: true,
};

function conflict() {
  throw new UserManagementError("The account changed while this request was being processed.", 409, "conflict");
}

async function lockAccount(transaction, target) {
  await transaction.$queryRawUnsafe('SELECT "id" FROM "User" WHERE "id" = $1 FOR UPDATE', target.id);
  const current = await transaction.user.findUnique({ where: { id: target.id }, select: USER_SELECT });
  if (!current) throw new UserManagementError("User not found.", 404, "not_found");
  if (current.revision !== target.revision || current.role !== target.role || current.status !== target.status) conflict();
  return current;
}

export const userRepository = Object.freeze({
  findCurrentUser(id) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, status: true },
    });
  },

  findById(id) {
    return prisma.user.findUnique({ where: { id }, select: USER_SELECT });
  },

  async list({ role, status, page, limit }) {
    const where = { ...(role ? { role } : {}), ...(status ? { status } : {}) };
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: [{ created_at: "desc" }, { id: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);
    return { users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  },

  async create({ name, email, password, role, actorUserId }) {
    const id = randomUUID();
    const password_hash = await bcrypt.hash(password, 12);
    return prisma.$transaction(async (transaction) => {
      await transaction.$queryRawUnsafe("SELECT set_config('app.user_management_actor_id', $1, true)", actorUserId);
      return transaction.user.create({
        data: { id, name: name ?? null, email, password_hash, role },
        select: USER_SELECT,
      });
    });
  },

  /**
   * Self-service producer registration. Distinct from admin-managed account creation:
   * the account is created as a producer role and email-verified at signup (there is no
   * email verification loop yet), so the producer can immediately begin a submission.
   */
  async createSelfServiceProducer({ name, email, password }) {
    const id = randomUUID();
    const password_hash = await bcrypt.hash(password, 12);
    return prisma.user.create({
      data: {
        id,
        name: name ?? null,
        email,
        password_hash,
        role: "producer",
        email_verified: new Date(),
      },
      select: USER_SELECT,
    });
  },

  transitionRole({ target, toRole, actorUserId, reason }) {
    return prisma.$transaction(async (transaction) => {
      const current = await lockAccount(transaction, target);
      await transaction.$queryRawUnsafe("SELECT pg_advisory_xact_lock(2026080501)");
      if (current.role === "super_admin" && current.status === "active" && toRole !== "super_admin") {
        const remaining = await transaction.user.count({
          where: { id: { not: current.id }, role: "super_admin", status: "active" },
        });
        if (remaining === 0) throw new UserManagementError("Cannot demote the final active super admin.", 409, "final_super_admin");
      }
      const revision = current.revision + 1;
      const updated = await transaction.user.update({
        where: { id: current.id },
        data: { role: toRole, revision },
        select: USER_SELECT,
      });
      await transaction.userAccountTransition.create({
        data: {
          user_id: current.id,
          actor_user_id: actorUserId,
          action: "role_changed",
          from_role: current.role,
          to_role: toRole,
          revision,
          reason,
        },
      });
      return updated;
    });
  },

  transitionStatus({ target, toStatus, actorUserId, reason, action }) {
    return prisma.$transaction(async (transaction) => {
      const current = await lockAccount(transaction, target);
      await transaction.$queryRawUnsafe("SELECT pg_advisory_xact_lock(2026080501)");
      if (current.role === "super_admin" && current.status === "active" && toStatus !== "active") {
        const remaining = await transaction.user.count({
          where: { id: { not: current.id }, role: "super_admin", status: "active" },
        });
        if (remaining === 0) throw new UserManagementError("Cannot deactivate the final active super admin.", 409, "final_super_admin");
      }
      const revision = current.revision + 1;
      const updated = await transaction.user.update({
        where: { id: current.id },
        data: {
          status: toStatus,
          revision,
          deactivated_at: toStatus === "deactivated" ? new Date() : null,
        },
        select: USER_SELECT,
      });
      await transaction.userAccountTransition.create({
        data: {
          user_id: current.id,
          actor_user_id: actorUserId,
          action,
          from_status: current.status,
          to_status: toStatus,
          revision,
          reason,
        },
      });
      return updated;
    });
  },
});
