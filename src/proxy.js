import { NextResponse } from "next/server";

const adminPaths = ["/admin"];
const adminApiPaths = ["/api/festivals"];

const publicPaths = ["/login", "/producer", "/api/auth", "/api/health"];

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Always allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check for session cookie (NextAuth v5 uses different cookie names)
  const sessionToken =
    request.cookies.get("next-auth.session-token") ||
    request.cookies.get("__Secure-next-auth.session-token") ||
    request.cookies.get("authjs.session-token") ||
    request.cookies.get("__Secure-authjs.session-token");

  const isAuthenticated = !!sessionToken;

  // Protect admin routes
  const isAdminPath = adminPaths.some((p) => pathname.startsWith(p));
  if (isAdminPath && !isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Protect admin API mutations (POST/PATCH/DELETE)
  const isAdminApi = adminApiPaths.some((p) => pathname.startsWith(p));
  const isMutation = ["POST", "PATCH", "DELETE"].includes(request.method);
  if (isAdminApi && isMutation && !isAuthenticated) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/festivals/:path*"],
};
