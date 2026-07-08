import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

// Role-based route protection
export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Public routes — no auth required
  const publicRoutes = ["/", "/login", "/api/auth"]
  if (publicRoutes.some((r) => pathname.startsWith(r))) return

  // All other routes require authentication
  if (!session) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = session.user?.role

  // Admin-only routes
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.url))
  }

  // Host-only routes
  if (pathname.startsWith("/host") && role !== "HOST" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.url))
  }

  // CRM-only routes
  if (pathname.startsWith("/crm") && role !== "CRM" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.url))
  }
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
}
