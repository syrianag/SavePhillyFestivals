import { randomUUID } from "node:crypto";

const stateKey = Symbol.for("save-philly-festivals.user-management-e2e-state");

function clone(value) {
  return value ? structuredClone(value) : value;
}

function state() {
  if (!globalThis[stateKey]) globalThis[stateKey] = { users: new Map() };
  return globalThis[stateKey];
}

export async function userManagementE2EDependencies() {
  if (process.env.PRODUCER_E2E_FIXTURE !== "1" || process.env.NODE_ENV === "production") return null;
  const { EDITORIAL_E2E_USER, producerE2ESelectedIdentity } = await import("@/features/producer-submission/producer-e2e-fixture");
  if (await producerE2ESelectedIdentity() !== "admin") return null;

  const actor = { ...EDITORIAL_E2E_USER, status: "active", revision: 0, created_at: new Date("2026-08-05T00:00:00.000Z"), updated_at: new Date("2026-08-05T00:00:00.000Z") };
  state().users.set(actor.id, actor);
  const repository = {
    async findCurrentUser(id) { return id === actor.id ? clone(actor) : null; },
    async findById(id) { return clone(state().users.get(id)); },
    async list({ role, status, page, limit }) {
      const users = [...state().users.values()].filter((user) => (!role || user.role === role) && (!status || user.status === status));
      return { users: clone(users.slice((page - 1) * limit, page * limit)), pagination: { page, limit, total: users.length, pages: Math.ceil(users.length / limit) } };
    },
    async create({ name, email, role }) {
      if ([...state().users.values()].some((user) => user.email === email)) {
        const error = new Error("duplicate"); error.code = "P2002"; throw error;
      }
      const now = new Date();
      const user = { id: randomUUID(), name: name ?? null, email, role, status: "active", revision: 0, deactivated_at: null, image: null, created_at: now, updated_at: now };
      state().users.set(user.id, user);
      return clone(user);
    },
    async transitionRole({ target, toRole }) {
      const user = { ...target, role: toRole, revision: target.revision + 1, updated_at: new Date() };
      state().users.set(user.id, user); return clone(user);
    },
    async transitionStatus({ target, toStatus }) {
      const user = { ...target, status: toStatus, revision: target.revision + 1, deactivated_at: toStatus === "deactivated" ? new Date() : null, updated_at: new Date() };
      state().users.set(user.id, user); return clone(user);
    },
  };
  return {
    getSession: async () => ({ user: { id: actor.id, role: "admin" } }),
    repository,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    nodeEnv: process.env.NODE_ENV,
    edgeRateLimitVerified: true,
    consumeRateLimit: () => true,
  };
}
