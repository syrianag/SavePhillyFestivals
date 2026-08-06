import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getSponsorsForSlot } from "@/features/sponsors/sponsor-placements";

function SponsorCreative({ sponsor }) {
  const creative = (
    <Image
      src={sponsor.imageUrl}
      alt={sponsor.alt || `${sponsor.name} (sponsor)`}
      width={sponsor.width || 300}
      height={sponsor.height || 250}
      unoptimized
      className="h-auto w-full rounded-xl border border-slate-200/60 bg-white"
    />
  );

  if (!sponsor.href) return creative;
  return (
    <Link
      href={sponsor.href}
      rel="sponsored noopener"
      target="_blank"
      aria-label={`${sponsor.name} (sponsor, opens in a new tab)`}
      className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal"
    >
      {creative}
    </Link>
  );
}

/**
 * Renders the sponsors configured for one slot, or nothing at all.
 *
 * Returning `null` on an empty slot is deliberate — an unsold rail must leave no blank
 * box behind, so pages without a sponsor look finished rather than broken.
 */
export function AdSlot({ slot, className, orientation = "vertical", label = "Sponsored" }) {
  const sponsors = getSponsorsForSlot(slot);
  if (sponsors.length === 0) return null;

  return (
    <aside
      aria-label={label}
      data-slot="ad-slot"
      data-ad-slot={slot}
      className={cn(
        "flex gap-4",
        orientation === "vertical" ? "flex-col" : "flex-row flex-wrap items-center justify-center",
        className
      )}
    >
      <p className="font-ui text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      {sponsors.map((sponsor) => (
        <SponsorCreative key={sponsor.name} sponsor={sponsor} />
      ))}
    </aside>
  );
}
