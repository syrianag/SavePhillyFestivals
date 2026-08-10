"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

/**
 * Inline pending feedback while a pagination navigation resolves.
 *
 * `useLinkStatus` must run inside the `<Link>` it reports on, so this stays a child rather than
 * a wrapper. Next's guidance is to reach for it exactly here: a dynamic destination with no
 * route-level `loading.js`, where the click would otherwise appear to do nothing until the
 * server responds.
 */
function PendingLabel({ children }) {
  const { pending } = useLinkStatus();
  return (
    <span className={cn("transition-opacity", pending && "opacity-60")}>
      {children}
      <span aria-live="polite" className="sr-only">{pending ? "Loading results" : ""}</span>
    </span>
  );
}

export function PaginationLink({ href, className, children }) {
  return (
    <Link href={href} className={className}>
      <PendingLabel>{children}</PendingLabel>
    </Link>
  );
}
