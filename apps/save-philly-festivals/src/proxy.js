import { NextResponse } from "next/server";

const adminPaths = ["/admin"];
const adminApiPaths = ["/api/festivals"];

const publicPaths = ["/login", "/api/auth", "/api/health"];

export async function proxy(request) {
  const { pathname, search } = request.nextUrl;

  // The producer marketing page is public; management descendants are not.
  if (pathname === "/producer" || publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const producerFixtureEnabled = process.env.PRODUCER_E2E_FIXTURE === "1"
    && process.env.NODE_ENV !== "production"
    && Boolean(process.env.PRODUCER_E2E_SECRET?.length >= 32);
  if (pathname === "/producer/e2e-login" && producerFixtureEnabled) {
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

  const fixtureProducer = producerFixtureEnabled && request.cookies.get("producer-e2e-user");
  const isAuthenticated = Boolean(sessionToken || fixtureProducer);

  const isProducerManagement = pathname.startsWith("/producer/");
  if (isProducerManagement && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (isProducerManagement) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-producer-path", `${pathname}${search}`);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Protect admin routes
  const isAdminPath = adminPaths.some((p) => pathname.startsWith(p));
  if (isAdminPath && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
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
  matcher: ["/admin/:path*", "/producer/:path*", "/api/festivals/:path*"],
};
