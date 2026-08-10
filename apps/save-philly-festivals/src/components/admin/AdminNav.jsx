"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* `/admin/pending` is a shortcut that redirects to the festivals list pre-filtered to
 * pending_review, so it earns its place. `/admin/submit` was dropped: it redirected to the
 * plain festivals list, which is a dead end rather than a destination. */
const navLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/festivals", label: "Festivals" },
  { href: "/admin/pending", label: "Pending Review" },
  { href: "/admin/imports", label: "Imports" },
  { href: "/admin/producer-requests", label: "Producer Access" },
  { href: "/admin/sponsors", label: "Sponsors" },
  { href: "/admin/email-templates", label: "Email Templates" },
  { href: "/admin/schedules", label: "Schedules" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminNav({ user }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef(null);

  /* Mirrors the public NavBar's disclosure behaviour: Escape closes and returns focus to the
   * control that opened the menu, so keyboard users are never stranded inside it. */
  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const linkClass = (href) => cn(
    "rounded-md px-1.5 py-1 text-sm font-medium transition-colors hover:text-slate-900",
    pathname === href ? "text-slate-900 font-bold" : "text-slate-500"
  );

  return (
    <nav className="border-b border-slate-200 bg-white" aria-label="Admin navigation">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-8">
            <Link href="/admin" className="font-heading text-lg font-bold text-slate-900">
              Admin
            </Link>
            <div className="hidden items-center gap-6 md:flex">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className={linkClass(link.href)}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden truncate text-sm text-slate-500 sm:inline">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
              Sign Out
            </Button>
            <button
              ref={toggleRef}
              type="button"
              className="flex rounded-lg p-2 text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 md:hidden"
              aria-label={open ? "Close admin menu" : "Open admin menu"}
              aria-expanded={open}
              aria-controls="admin-mobile-menu"
              onClick={() => setOpen((current) => !current)}
            >
              {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {open && (
          <div id="admin-mobile-menu" className="flex flex-col gap-1 border-t border-slate-200 py-3 md:hidden">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(linkClass(link.href), "px-2 py-2")}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
