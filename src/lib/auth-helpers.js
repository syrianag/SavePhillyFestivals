import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const ROLES = {
  PUBLIC: "public",
  PRODUCER: "producer",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
};

export const ROLE_HIERARCHY = {
  [ROLES.PUBLIC]: 0,
  [ROLES.PRODUCER]: 1,
  [ROLES.ADMIN]: 2,
  [ROLES.SUPER_ADMIN]: 3,
};

export async function getSession() {
  return auth();
}

export async function requireSession(redirectTo = "/login") {
  const session = await getSession();
  if (!session) redirect(redirectTo);
  return session;
}

export async function requireRole(role, redirectTo = "/login") {
  const session = await requireSession(redirectTo);
  const userLevel = ROLE_HIERARCHY[session.user.role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[role] ?? 0;
  if (userLevel < requiredLevel) redirect("/");
  return session;
}

export async function requireProducer() {
  return requireRole(ROLES.PRODUCER);
}

export async function requireAdmin() {
  return requireRole(ROLES.ADMIN);
}

export function hasRole(session, role) {
  if (!session) return false;
  const userLevel = ROLE_HIERARCHY[session.user.role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[role] ?? 0;
  return userLevel >= requiredLevel;
}
