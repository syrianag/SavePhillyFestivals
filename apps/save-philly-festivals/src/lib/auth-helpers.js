import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
  if (process.env.PRODUCER_E2E_FIXTURE === "1" && process.env.NODE_ENV !== "production") {
    const { EDITORIAL_E2E_USER, producerE2ESelectedIdentity } = await import("@/features/producer-submission/producer-e2e-fixture");
    if (await producerE2ESelectedIdentity() === "admin" && (ROLE_HIERARCHY[EDITORIAL_E2E_USER.role] ?? 0) >= (ROLE_HIERARCHY[role] ?? 0)) {
      return { user: { ...EDITORIAL_E2E_USER } };
    }
  }
  const session = await requireSession(redirectTo);
  const currentUser = session.user?.id ? await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true },
  }) : null;
  if (!currentUser) redirect(redirectTo);
  const userLevel = ROLE_HIERARCHY[currentUser.role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[role] ?? 0;
  if (userLevel < requiredLevel) redirect("/");
  return { ...session, user: { ...session.user, ...currentUser } };
}

export async function requireAdmin() {
  return requireRole(ROLES.ADMIN);
}
