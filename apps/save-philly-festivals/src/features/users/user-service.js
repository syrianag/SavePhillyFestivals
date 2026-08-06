import { assertCanChangeRole, assertCanChangeStatus, assertCanCreateUser, UserManagementError } from "./user-policy";

async function requireTarget(repository, id) {
  const target = await repository.findById(id);
  if (!target) throw new UserManagementError("User not found.", 404, "not_found");
  return target;
}

export function listManagedUsers(input, { repository }) {
  return repository.list(input);
}

export async function getManagedUser(id, { repository }) {
  return requireTarget(repository, id);
}

export async function createManagedUser(input, { actor, repository }) {
  assertCanCreateUser(actor, input.role);
  return repository.create({ ...input, actorUserId: actor.id });
}

export async function updateManagedUser(id, input, { actor, repository }) {
  const target = await requireTarget(repository, id);
  if (input.role !== undefined) {
    assertCanChangeRole(actor, target, input.role);
    return repository.transitionRole({ target, toRole: input.role, actorUserId: actor.id, reason: input.reason });
  }
  assertCanChangeStatus(actor, target, input.status);
  return repository.transitionStatus({ target, toStatus: input.status, actorUserId: actor.id, reason: input.reason, action: "status_changed" });
}

export async function deactivateManagedUser(id, { actor, repository }) {
  const target = await requireTarget(repository, id);
  assertCanChangeStatus(actor, target, "deactivated", { deleteEquivalent: true });
  return repository.transitionStatus({ target, toStatus: "deactivated", actorUserId: actor.id, action: "delete_equivalent" });
}
