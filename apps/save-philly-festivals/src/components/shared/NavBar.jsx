"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";

/**
 * Link visibility policy — one rule, applied in both directions.
 *
 *   Public links   render only in this public navigation, for everyone, signed in or not.
 *   Private links  (anything under /admin or /producer) render only inside that portal's own
 *                  navigation, never in this list.
 *   The exception  "Discover Festivals" (`/`) is global: it is the one link allowed in every
 *                  navigation, including the admin portal, so there is always a way back to
 *                  the public site.
 *
 * A signed-in editor still needs a way *into* their portal, so that link lives with the
 * session controls (beside the account and sign-out actions) rather than among the public
 * links. It is a property of who you are, not of where you can browse — which is exactly the
 * distinction that kept getting blurred when it sat in this array.
 *
 * Do not add an /admin or /producer entry to `publicLinks`.
 */
const publicLinks = [
  { href: "/", label: "Discover Festivals" },
  { href: "/calendar", label: "Calendar" },
  { href: "/our-festivals", label: "Our Festivals" },
  { href: "/about", label: "About" },
  { href: "/tours", label: "Tours" },
  { href: "/producer", label: "For Producers" },
];

/* Where each role's portal lives. Rendered as a session control, never as a public link. */
const PORTAL_BY_ROLE = {
  admin: { href: "/admin", label: "Admin portal" },
  super_admin: { href: "/admin", label: "Admin portal" },
  producer: { href: "/producer/dashboard", label: "Producer portal" },
};

export function NavBar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const firstMobileLinkRef = useRef(null);
  const { data: session } = useSession();

  const isSignedIn = Boolean(session?.user);
  const isStaff = session?.user?.role === "admin" || session?.user?.role === "super_admin";
  const isProducerArea = pathname.startsWith("/producer/");

  /* Always the public set, whoever is looking. The previous version swapped in a different
   * array per pathname, including an `/admin` branch that could never run — `admin/layout.jsx`
   * renders `AdminNav` instead of this component, so those entries were unreachable while
   * still reading like the admin navigation. */
  const navLinks = publicLinks;
  const portal = PORTAL_BY_ROLE[session?.user?.role];



  useEffect(() => {
    if (!mobileOpen) return;

    firstMobileLinkRef.current?.focus();
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  if (isProducerArea) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-[77px] max-w-[1440px] items-center justify-between px-4 md:px-[81px]">
        <Link
          href="/"
          className="flex items-center shrink-0 transition-transform duration-300 hover:scale-101"
        >
          <Image
            src="/logos/PF-Logo-TM.png"
            alt="Save Philly Festivals"
            width={200}
            height={113}
            className="h-auto w-[180px] sm:w-[200px] max-w-full"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-[30px] md:flex" aria-label="Primary navigation">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className={cn(
                "rounded-md px-1.5 py-1 font-body text-base font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-500",
                pathname === link.href
                  ? "text-indigo-600"
                  : "text-slate-500 hover:text-slate-900"
              )}
              style={{ letterSpacing: "-0.15px" }}
            >
              {link.label}
            </Link>
          ))}
          {isSignedIn && !isStaff && (
            <Link
              href="/account"
              aria-current={pathname === "/account" ? "page" : undefined}
              className={cn(
                "rounded-md px-1.5 py-1 font-body text-base font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-500",
                pathname === "/account"
                  ? "text-indigo-600"
                  : "text-slate-500 hover:text-slate-900"
              )}
              style={{ letterSpacing: "-0.15px" }}
            >
              My account
            </Link>
          )}
          {/* A session control, deliberately outside `navLinks`: it is private and role-based,
            * so it must not sit among the public links. Styled as a button to read as an entry
            * point rather than another page in the public site. */}
          {portal && (
            <Link
              href={portal.href}
              className="flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 font-ui text-sm font-semibold text-indigo-700 transition-all hover:bg-indigo-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-500"
            >
              {portal.label}
            </Link>
          )}
          {isSignedIn && (
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 font-ui text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-500"
            >
              <LogOut className="size-3.5" />
              Sign Out
            </button>
          )}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          {isSignedIn ? (
            <span className="font-ui text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/50">
              {session.user.email}
            </span>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-slate-900 px-5 py-2 font-ui text-sm font-bold text-white transition-all hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 shadow-2xs hover:shadow-xs"
            >
              Login
            </Link>
          )}
        </div>

        <button
          ref={menuButtonRef}
          type="button"
          className="flex rounded-lg p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 text-slate-700 hover:bg-slate-100 md:hidden transition-colors"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
        >
          {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {mobileOpen && (
        <nav id="mobile-navigation" className="border-t border-slate-200 bg-white px-4 pb-4 pt-2 md:hidden" aria-label="Mobile navigation">
          {navLinks.map((link, index) => (
            <Link
              key={link.href}
              ref={index === 0 ? firstMobileLinkRef : undefined}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              aria-current={pathname === link.href ? "page" : undefined}
              className={cn(
                "block rounded-md px-3 py-2 font-body text-base font-bold transition-all",
                pathname === link.href
                  ? "text-indigo-600 bg-indigo-50/50"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50/50"
              )}
            >
              {link.label}
            </Link>
          ))}
          {isSignedIn ? (
            <>
              {!isStaff && (
                <Link
                  href="/account"
                  onClick={() => setMobileOpen(false)}
                  aria-current={pathname === "/account" ? "page" : undefined}
                  className={cn(
                    "block rounded-md px-3 py-2 font-body text-base font-bold transition-all",
                    pathname === "/account"
                      ? "text-indigo-600 bg-indigo-50/50"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50/50"
                  )}
                >
                  My account
                </Link>
              )}
              <div className="mt-2 border-t border-slate-100 pt-2 px-3">
                <span className="block py-1.5 font-ui text-xs font-bold text-slate-500">
                  {session.user.email}
                </span>
                {/* Same rule as the desktop bar: private, role-based, grouped with the session
                  * controls rather than listed as a public destination. */}
                {portal && (
                  <Link
                    href={portal.href}
                    onClick={() => setMobileOpen(false)}
                    className="mt-1 flex w-full items-center justify-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 py-2 font-ui text-sm font-bold text-indigo-700 transition-colors hover:bg-indigo-100"
                  >
                    {portal.label}
                  </Link>
                )}
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    signOut({ callbackUrl: "/" });
                  }}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 py-2 font-ui text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="mt-4 block rounded-full bg-slate-900 py-2.5 text-center font-ui text-sm font-bold text-white transition-colors hover:bg-slate-800 shadow-2xs"
            >
              Login
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
