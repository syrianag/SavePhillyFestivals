import { describe, expect, it, vi } from "vitest";

import { authorizeUserManager } from "../../src/features/users/user-authorization";
import { assertCanChangeRole, assertCanChangeStatus, assertCanCreateUser } from "../../src/features/users/user-policy";
import { createUserSchema, listUsersQuerySchema, updateUserSchema, userPasswordSchema } from "../../src/features/users/user-schema";
import { createManagedUser, deactivateManagedUser } from "../../src/features/users/user-service";

const admin = { id: "admin-1", email: "admin@example.test", role: "admin", status: "active" };
const superAdmin = { id: "super-1", email: "super@example.test", role: "super_admin", status: "active" };
const producer = { id: "producer-1", email: "producer@example.test", role: "producer", status: "active", revision: 0 };

describe("user-management input contracts", () => {
  it("normalizes bounded emails and enforces the exact role allowlist", () => {
    const parsed = createUserSchema.parse({ email: " Staff@Example.TEST ", password: "StrongPass12!", role: "producer" });
    expect(parsed.email).toBe("staff@example.test");
    expect(createUserSchema.safeParse({ email: "staff@example.test", password: "StrongPass12!", role: "owner" }).success).toBe(false);
    expect(createUserSchema.safeParse({ email: `${"a".repeat(250)}@x.test`, password: "StrongPass12!" }).success).toBe(false);
    expect(createUserSchema.safeParse({ email: "staff@example.test", password: "StrongPass12!", unexpected: true }).success).toBe(false);
  });

  it.each(["short1!A", "alllowercase12!", "ALLUPPERCASE12!", "NoNumbersHere!", "NoSymbolsHere12", "Has Space12!A"])("rejects weak password %s", (password) => {
    expect(userPasswordSchema.safeParse(password).success).toBe(false);
  });

  it("requires one bounded role or status transition and bounded list queries", () => {
    expect(updateUserSchema.safeParse({ role: "producer" }).success).toBe(true);
    expect(updateUserSchema.safeParse({ status: "deactivated", reason: "Access ended" }).success).toBe(true);
    expect(updateUserSchema.safeParse({ role: "producer", status: "active" }).success).toBe(false);
    expect(updateUserSchema.safeParse({}).success).toBe(false);
    expect(listUsersQuerySchema.safeParse({ page: "1", limit: "100" }).success).toBe(true);
    expect(listUsersQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
  });
});

describe("user-management authorization policy", () => {
  it("reloads the account and rejects a stale admin JWT after demotion or deactivation", async () => {
    const repository = { findCurrentUser: vi.fn().mockResolvedValue({ ...producer }) };
    await expect(authorizeUserManager({ getSession: async () => ({ user: { id: producer.id, role: "admin" } }), repository })).rejects.toMatchObject({ statusCode: 403 });
    repository.findCurrentUser.mockResolvedValue({ ...admin, status: "deactivated" });
    await expect(authorizeUserManager({ getSession: async () => ({ user: { id: admin.id, role: "admin" } }), repository })).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.findCurrentUser).toHaveBeenCalledTimes(2);
  });

  it("allows admins to create ordinary accounts but reserves privileged accounts for super admins", () => {
    expect(() => assertCanCreateUser(admin, "producer")).not.toThrow();
    expect(() => assertCanCreateUser(admin, "admin")).toThrow(/super admin/i);
    expect(() => assertCanCreateUser(superAdmin, "super_admin")).not.toThrow();
  });

  it("prevents admins from promoting, demoting, or deactivating privileged accounts", () => {
    expect(() => assertCanChangeRole(admin, producer, "admin")).toThrow(/super admin/i);
    expect(() => assertCanChangeRole(admin, { ...admin, id: "admin-2" }, "producer")).toThrow(/super admin/i);
    expect(() => assertCanChangeStatus(admin, superAdmin, "deactivated")).toThrow(/super admin/i);
  });

  it("prevents self-deactivation", () => {
    expect(() => assertCanChangeStatus(superAdmin, superAdmin, "deactivated", { deleteEquivalent: true })).toThrow(/own account/i);
  });

  it("passes the authenticated actor into audited repository writes", async () => {
    const repository = {
      create: vi.fn().mockResolvedValue({ id: "new-user" }),
      findById: vi.fn().mockResolvedValue(producer),
      transitionStatus: vi.fn().mockResolvedValue({ ...producer, status: "deactivated" }),
    };
    await createManagedUser({ email: "new@example.test", password: "StrongPass12!", role: "producer" }, { actor: admin, repository });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: admin.id }));
    await deactivateManagedUser(producer.id, { actor: admin, repository });
    expect(repository.transitionStatus).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: admin.id, action: "delete_equivalent" }));
  });
});
