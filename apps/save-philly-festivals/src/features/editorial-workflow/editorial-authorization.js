import { EDITORIAL_ROLES } from "./editorial-transition-policy";

export class EditorialAuthenticationError extends Error {
  constructor() { super("Authentication required."); this.statusCode = 401; this.code = "unauthenticated"; }
}
export class EditorialAuthorizationError extends Error {
  constructor() { super("Editorial access required."); this.statusCode = 403; this.code = "forbidden"; }
}

export async function authorizeEditor({ getSession, userRepository }) {
  const session = await getSession();
  const id = session?.user?.id;
  if (!id) throw new EditorialAuthenticationError();
  const user = await userRepository.findCurrentUser(id);
  if (!user) throw new EditorialAuthenticationError();
  if (!EDITORIAL_ROLES.includes(user.role)) throw new EditorialAuthorizationError();
  return Object.freeze({ id: user.id, email: user.email, role: user.role });
}
