"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  Clock,
  ListMusic,
  Settings,
  LogOut,
  Menu,
  X,
  Users,
  Building2,
} from "lucide-react";

const navGroups = [
  {
    label: "Overview",
    links: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Content",
    links: [
      { href: "/admin/festivals", label: "Festivals", icon: Calendar },
      { href: "/admin/pending", label: "Pending Review", icon: Clock },
      { href: "/admin/schedules", label: "Schedules", icon: ListMusic },
      { href: "/admin/organizations", label: "Organizations", icon: Building2 },
    ],
  },
  {
    label: "Management",
    links: [
      { href: "/admin/producers", label: "Producers", icon: Users },
    ],
  },
  {
    label: "System",
    links: [
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function AdminSidebar({ user }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 flex size-9 items-center justify-center rounded-lg border bg-background md:hidden"
        aria-label="Open sidebar"
      >
        <Menu className="size-5" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r bg-sidebar transition-transform md:static md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-6">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-brand-yellow text-xs font-bold text-brand-dark">
              SPF
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-sidebar-foreground">Admin</p>
              <p className="text-[10px] text-sidebar-foreground/60">Save Philly Festivals</p>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="flex size-7 items-center justify-center rounded-md hover:bg-sidebar-accent md:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.links.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive(link.href)
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t px-3 py-4">
          <div className="mb-3 flex items-center gap-3 px-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {(user?.name?.[0] || user?.email?.[0] || "A").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {user?.name || "Admin"}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/50">
                {user?.email}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full justify-start gap-2"
          >
            <LogOut className="size-3.5" />
            Sign Out
          </Button>
        </div>
      </aside>
    </>
  );
}
