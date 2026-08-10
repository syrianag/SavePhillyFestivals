import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SPONSOR_TILE } from "@/features/sponsors/sponsor-placements";
import { sponsorsForSlots } from "@/features/sponsors/sponsor-source";

/**
 * A sponsor with no artwork on file, drawn as a name pill in its own colors.
 *
 * Sized to the same 320x120 footprint as an image tile so a band mixing both forms
 * still lines up on one row.
 */
function SponsorPill({ sponsor }) {
  return (
    <div className="flex aspect-320/120 w-full items-center justify-center rounded-xl bg-white p-4">
      <span
        className="inline-flex items-center justify-center rounded-full px-5 py-2 text-center font-heading text-sm font-bold"
        style={{ backgroundColor: sponsor.pillColor, color: sponsor.textColor }}
      >
        {sponsor.name}
      </span>
    </div>
  );
}

function SponsorCreative({ sponsor, onDark = true }) {
  const creative = sponsor.imageUrl ? (
    <Image
      src={sponsor.imageUrl}
      alt={sponsor.alt || `${sponsor.name} (sponsor)`}
      width={sponsor.width || SPONSOR_TILE.width}
      height={sponsor.height || SPONSOR_TILE.height}
      unoptimized
      className="h-auto w-full rounded-xl bg-white"
    />
  ) : (
    <SponsorPill sponsor={sponsor} />
  );

  /* Footer tiles sit on the footer's brand-dark ground, so the frame is a translucent white
   * ring rather than a slate border — the same white/10 hairline the footer already uses for
   * its own dividers. Rails sit on the light page ground and need a slate hairline instead. */
  const frame = cn(
    "mx-auto block w-full rounded-xl ring-1 transition",
    onDark ? "max-w-80 ring-white/10" : "ring-slate-200"
  );

  if (!sponsor.href) {
    return <div className={frame}>{creative}</div>;
  }

  return (
    <Link
      href={sponsor.href}
      rel="sponsored noopener"
      target="_blank"
      aria-label={`${sponsor.name} (sponsor, opens in a new tab)`}
      className={cn(
        frame,
        onDark
          ? "hover:ring-white/40 focus-visible:outline-brand-yellow"
          : "hover:ring-slate-400 focus-visible:outline-indigo-500",
        "focus-visible:outline-2 focus-visible:outline-offset-4"
      )}
    >
      {creative}
    </Link>
  );
}

/**
 * Renders the sponsors configured for one slot, or nothing at all.
 *
 * Returning `null` on an empty slot is deliberate — an unsold band must leave no blank
 * box behind, so a page with no sponsor looks finished rather than broken.
 */
export async function AdSlot({ slot, slots, className, label = "Our Sponsors", orientation = "band" }) {
  const requested = slots?.length ? slots : [slot].filter(Boolean);
  if (!requested.length) return null;

  const sponsors = await sponsorsForSlots(requested);
  if (sponsors.length === 0) return null;

  const isRail = orientation === "rail";
  const headingId = `sponsor-slot-${requested.join("-")}`;

  /* The band is full-bleed so its divider spans the whole footer, with the content
   * inset on the footer's own 1440px / 81px container so sponsors line up with the
   * logo and link columns below them. Both live here rather than on the caller because
   * the whole section must disappear together when the slot is unsold — a wrapper owned
   * by the footer would leave an empty bordered strip behind. */
  return (
    <section
      aria-labelledby={headingId}
      data-slot="ad-slot"
      data-ad-slot={requested.join(" ")}
      data-ad-orientation={orientation}
      className={cn("w-full", className)}
    >
      <div
        className={cn(
          "flex w-full flex-col gap-4",
          isRail ? "items-stretch" : "mx-auto max-w-[1440px] px-4 md:px-[81px]"
        )}
      >
        {/* Matches the footer's own section headings so the band reads as part of the
          * footer rather than as pasted-in ad furniture. Naming it "Our Sponsors" is
          * also the paid-placement disclosure. */}
        <h2
          id={headingId}
          className={cn(
            "text-center font-body text-sm font-semibold",
            isRail ? "text-slate-500" : "text-white"
          )}
        >
          {label}
        </h2>
        <ul
          className={cn(
            "flex list-none p-0",
            isRail ? "flex-col gap-4" : "flex-wrap justify-center gap-4"
          )}
        >
          {sponsors.map((sponsor) => (
            <li
              key={`${sponsor.name}-${sponsor.imageUrl || sponsor.pillColor}`}
              className={cn("min-w-0", isRail ? "w-full" : "flex-1 basis-65 sm:max-w-80")}
            >
              <SponsorCreative sponsor={sponsor} onDark={!isRail} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
