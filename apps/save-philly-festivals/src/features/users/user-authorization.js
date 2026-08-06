import { assertManagementRole, UserManagementError } from "./user-policy";

export async function authorizeUserManager({ getSession, repository }) {
  const session = await getSession();
  const id = session?.user?.id;
  if (!id) throw new UserManagementError("Authentication required.", 401, "unauthenticated");

  const actor = await repository.findCurrentUser(id);
  if (!actor) throw new UserManagementError("Authentication required.", 401, "unauthenticated");
  assertManagementRole(actor);
  return Object.freeze(actor);
}
