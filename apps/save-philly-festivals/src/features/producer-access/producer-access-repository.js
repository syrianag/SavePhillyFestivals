import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/db";
import { DEFAULT_TEMPLATES } from "./email-template-service";

export class ProducerAccessError extends Error {
  constructor(message, statusCode = 400, code = "invalid_request") {
    super(message);
    this.name = "ProducerAccessError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

const requestSelect = {
  id: true,
  status: true,
  organization: true,
  festival_name: true,
  message: true,
  decision_reason: true,
  decided_at: true,
  created_at: true,
  user: { select: { id: true, name: true, email: true, role: true, status: true } },
  decided_by: { select: { id: true, email: true } },
};

const templateSelect = {
  id: true, key: true, name: true, subject: true, body: true,
  description: true, enabled: true, created_at: true, updated_at: true,
};

export const producerAccessRepository = {
  findUserByEmail(email) {
    return prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  },

  /**
   * Creates a self-registered account.
   *
   * The role is hardcoded to `public` rather than taken from input: this is the one endpoint
   * reachable without credentials, and accepting a role from the request body would make it a
   * privilege-escalation vector. Producer rights are granted only by the approval path below.
   */
  createPublicAccount({ name, email, passwordHash }) {
    /* No explicit audit row here: `User_account_creation_audit_trigger` writes the
     * `account_created` transition on insert, and adding a second one violates the unique
     * index on (user_id, revision). Role changes are different — the update trigger only
     * *verifies* a matching transition exists, so `decideRequest` writes that one itself. */
    return prisma.user.create({
      data: { id: randomUUID(), name, email, password_hash: passwordHash, role: "public", status: "active", revision: 0 },
      select: { id: true, name: true, email: true, role: true, revision: true },
    });
  },

  findOpenRequestForUser(userId) {
    return prisma.producerAccessRequest.findFirst({
      where: { user_id: userId, status: "pending" },
      select: requestSelect,
    });
  },

  findLatestRequestForUser(userId) {
    return prisma.producerAccessRequest.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      select: requestSelect,
    });
  },

  createRequest({ userId, organization, festivalName, message }) {
    return prisma.producerAccessRequest.create({
      data: { id: randomUUID(), user_id: userId, organization, festival_name: festivalName, message },
      select: requestSelect,
    });
  },

  listRequests(status) {
    return prisma.producerAccessRequest.findMany({
      where: status ? { status } : {},
      orderBy: [{ status: "asc" }, { created_at: "asc" }],
      select: requestSelect,
    });
  },

  /**
   * Records a decision and, on approval, grants the producer role in the same transaction.
   *
   * Both halves must commit together: a granted role with no request record is unauditable, and
   * an approved request whose role never applied leaves the applicant stuck with a success
   * message and no access.
   */
  decideRequest({ requestId, decision, reason, actorUserId }) {
    return prisma.$transaction(async (transaction) => {
      const request = await transaction.producerAccessRequest.findUnique({
        where: { id: requestId },
        select: { id: true, status: true, user_id: true },
      });
      if (!request) throw new ProducerAccessError("Request not found.", 404, "not_found");
      if (request.status !== "pending") {
        throw new ProducerAccessError("This request has already been decided.", 409, "already_decided");
      }

      if (decision === "approved") {
        const user = await transaction.user.findUnique({
          where: { id: request.user_id },
          select: { id: true, role: true, status: true, revision: true },
        });
        if (!user) throw new ProducerAccessError("Applicant account no longer exists.", 409, "user_missing");
        if (user.status !== "active") {
          throw new ProducerAccessError("Applicant account is deactivated.", 409, "user_inactive");
        }
        /* Never demote: approving a request from someone already holding a higher role must not
         * quietly strip it. */
        if (user.role === "public") {
          const nextRevision = user.revision + 1;
          await transaction.user.update({
            where: { id: user.id },
            data: { role: "producer", revision: nextRevision },
          });
          await transaction.userAccountTransition.create({
            data: {
              user_id: user.id,
              actor_user_id: actorUserId,
              action: "role_changed",
              from_role: user.role,
              to_role: "producer",
              revision: nextRevision,
              reason: reason || "Producer access approved",
            },
          });
        }
      }

      return transaction.producerAccessRequest.update({
        where: { id: requestId },
        data: { status: decision, decision_reason: reason || null, decided_by_user_id: actorUserId, decided_at: new Date() },
        select: requestSelect,
      });
    });
  },

  listTemplates() {
    return prisma.emailTemplate.findMany({ orderBy: { key: "asc" }, select: templateSelect });
  },

  findTemplate(key) {
    return prisma.emailTemplate.findUnique({ where: { key }, select: templateSelect });
  },

  createTemplate(data) {
    return prisma.emailTemplate.create({ data: { id: randomUUID(), ...data }, select: templateSelect });
  },

  async updateTemplate(key, data) {
    const updated = await prisma.emailTemplate.updateMany({ where: { key }, data });
    if (updated.count !== 1) throw new ProducerAccessError("Template not found.", 404, "not_found");
    return prisma.emailTemplate.findUnique({ where: { key }, select: templateSelect });
  },

  /** Idempotent seed so the admin screen is never empty on a fresh environment. */
  async ensureDefaultTemplates() {
    for (const template of DEFAULT_TEMPLATES) {
      const existing = await prisma.emailTemplate.findUnique({ where: { key: template.key }, select: { id: true } });
      if (!existing) await prisma.emailTemplate.create({ data: { id: randomUUID(), ...template } });
    }
    return this.listTemplates();
  },
};
