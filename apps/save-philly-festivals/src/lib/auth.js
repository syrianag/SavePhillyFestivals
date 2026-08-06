import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const authSecret = process.env.AUTH_SECRET;

if (!authSecret) {
  throw new Error(
    'AUTH_SECRET is not configured. Run "pnpm run auth:secret" for local development.'
  );
}

const nextAuth = NextAuth({
  secret: authSecret,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || user.status !== "active") {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id || token.sub;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

export const { handlers, signIn, signOut } = nextAuth;
const sessionAuth = nextAuth.auth;

export async function auth(...args) {
  const session = await sessionAuth(...args);
  const userId = session?.user?.id;
  if (!userId) return session;

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, status: true },
  });
  if (!currentUser || currentUser.status !== "active") return null;

  return {
    ...session,
    user: { ...session.user, id: currentUser.id, email: currentUser.email, name: currentUser.name, role: currentUser.role },
  };
}
