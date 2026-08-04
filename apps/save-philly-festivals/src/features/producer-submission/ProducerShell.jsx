"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "/producer/dashboard", label: "Overview" },
  { href: "/producer/festivals", label: "My submissions" },
  { href: "/producer/submit", label: "New submission" },
];

function NavLinks({ pathname, close }) {
  return links.map((link) => (
    <Link
      key={link.href}
      href={link.href}
      onClick={close}
      className={`rounded-md px-3 py-2 font-body text-base font-semibold transition-colors ${
        pathname === link.href ? "bg-black text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
      }`}
    >
      {link.label}
    </Link>
  ));
}

export default function ProducerShell({ children, user }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen min-w-0 bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="min-w-0 shrink" aria-label="Save Philly Festivals home">
            <Image src="/logos/PF-Logo-TM.png" alt="Save Philly Festivals" width={180} height={65} className="h-auto max-h-16 w-auto max-w-[190px]" priority />
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Producer management">
            <NavLinks pathname={pathname} />
            <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="ml-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
              <LogOut className="size-4" aria-hidden="true" /> Sign out
            </button>
          </nav>
          <button type="button" className="rounded-md p-2 md:hidden" onClick={() => setMobileOpen((open) => !open)} aria-expanded={mobileOpen} aria-controls="producer-mobile-nav" aria-label="Toggle producer menu">
            {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
        {mobileOpen && (
          <nav id="producer-mobile-nav" className="flex flex-col gap-1 border-t border-slate-200 px-4 py-3 md:hidden" aria-label="Producer management mobile">
            <NavLinks pathname={pathname} close={() => setMobileOpen(false)} />
            <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100">
              <LogOut className="size-4" aria-hidden="true" /> Sign out
            </button>
          </nav>
        )}
      </header>
      <main className="mx-auto min-w-0 max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="mb-4 truncate text-sm text-slate-500">Signed in as {user.email}</p>
        {children}
      </main>
    </div>
  );
}
