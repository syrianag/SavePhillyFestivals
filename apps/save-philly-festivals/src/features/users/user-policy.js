const MANAGEMENT_ROLES = new Set(["admin", "super_admin"]);
const PRIVILEGED_ROLES = new Set(["admin", "super_admin"]);

export class UserManagementError extends Error {
  constructor(message, statusCode = 400, code = "invalid_request") {
    super(message);
    this.name = "UserManagementError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function forbidden(message) {
  throw new UserManagementError(message, 403, "forbidden");
}

export function assertManagementRole(actor) {
  if (!actor || actor.status !== "active" || !MANAGEMENT_ROLES.has(actor.role)) {
    forbidden("Active administrator access is required.");
  }
}

export function assertCanCreateUser(actor, role) {
  assertManagementRole(actor);
  if (PRIVILEGED_ROLES.has(role) && actor.role !== "super_admin") {
    forbidden("Only a super admin can create a privileged account.");
  }
}

export function assertCanChangeRole(actor, target, nextRole) {
  assertManagementRole(actor);
  if (target.role === nextRole) throw new UserManagementError("The account already has that role.", 409, "no_change");
  if (PRIVILEGED_ROLES.has(target.role) || PRIVILEGED_ROLES.has(nextRole)) {
    if (actor.role !== "super_admin") forbidden("Only a super admin can promote or demote privileged accounts.");
  }
  if (target.role === "super_admin" && actor.role !== "super_admin") {
    forbidden("An admin cannot manage a super admin.");
  }
}

export function assertCanChangeStatus(actor, target, nextStatus, { deleteEquivalent = false } = {}) {
  assertManagementRole(actor);
  if (target.status === nextStatus) throw new UserManagementError("The account already has that status.", 409, "no_change");
  if (nextStatus === "deactivated" && actor.id === target.id) {
    throw new UserManagementError("You cannot deactivate your own account.", 400, "self_deactivation");
  }
  if (PRIVILEGED_ROLES.has(target.role) && actor.role !== "super_admin") {
    forbidden(`Only a super admin can ${deleteEquivalent ? "deactivate" : "manage"} a privileged account.`);
  }
  if (target.role === "super_admin" && actor.role !== "super_admin") {
    forbidden("An admin cannot manage a super admin.");
  }
}

export function isPrivilegedRole(role) {
  return PRIVILEGED_ROLES.has(role);
}
