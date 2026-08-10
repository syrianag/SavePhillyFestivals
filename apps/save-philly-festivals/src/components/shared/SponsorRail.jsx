import { AdSlot } from "@/components/shared/AdSlot";
import { cn } from "@/lib/utils";

/**
 * A vertical sponsor rail flanking the page content on wide screens.
 *
 * Hidden below `2xl` rather than `xl`: the content container is `max-w-[1440px]`, and two
 * 176px rails need roughly 1792px of viewport before they stop squeezing it. Below that the
 * same sponsors are rendered by the footer instead, so a rail advertiser is relocated on small
 * screens rather than dropped — see `Footer`.
 */
export function SponsorRail({ slot, className }) {
  return (
    <aside
      aria-label="Sponsors"
      className={cn("hidden w-44 shrink-0 2xl:block", className)}
    >
      <div className="sticky top-24">
        <AdSlot slot={slot} orientation="rail" label="Sponsor" />
      </div>
    </aside>
  );
}
