const ALLOWED_PRODUCER_ROLES = new Set(["producer", "admin", "super_admin"]);

export class ProducerAuthenticationError extends Error {
  constructor() {
    super("Authentication required.");
    this.name = "ProducerAuthenticationError";
    this.statusCode = 401;
  }
}

export class ProducerAuthorizationError extends Error {
  constructor() {
    super("Verified producer access required.");
    this.name = "ProducerAuthorizationError";
    this.statusCode = 403;
  }
}

export async function authorizeProducer({ getSession, userRepository }) {
  const session = await getSession();
  const sessionUserId = session?.user?.id;
  if (!sessionUserId) throw new ProducerAuthenticationError();

  const user = await userRepository.findCurrentUser(sessionUserId);
  if (!user) throw new ProducerAuthenticationError();
  if (!user.email_verified || !ALLOWED_PRODUCER_ROLES.has(user.role)) {
    throw new ProducerAuthorizationError();
  }

  return Object.freeze({ id: user.id, email: user.email, role: user.role });
}
