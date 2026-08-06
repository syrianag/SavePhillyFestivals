import { cn } from "@/lib/utils";

const DEFAULT_BG = "#1E7BF6";

/* Initials give each artwork-less festival a stable, identifiable mark instead of a
 * generic block, so the ~400 imported festivals read as intentional rather than broken. */
function festivalInitials(title) {
  const words = String(title || "")
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
  if (words.length === 0) return "SPF";
  return words
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

/**
 * Branded stand-in shown wherever a festival has no `image_url`.
 *
 * Imported festivals arrive without artwork by construction — the festival CSV contract
 * carries no image column — so this is the default presentation for most of the catalog
 * until organizers upload a flyer. It is deliberately distinct from a real photo so the
 * team can scan the site and see which festivals still need one.
 */
export function FestivalImagePlaceholder({ title, bgColor, className, showLabel = true }) {
  const base = bgColor || DEFAULT_BG;
  return (
    <div
      data-slot="festival-image-placeholder"
      data-artwork="missing"
      role="img"
      aria-label={`${title || "Festival"} — no photo yet`}
      className={cn("relative flex size-full items-center justify-center overflow-hidden", className)}
      style={{ backgroundImage: `linear-gradient(135deg, ${base}dd, #0f172a)` }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent)]"
      />
      <span
        aria-hidden="true"
        className="relative font-heading text-3xl font-bold tracking-tight text-white/90 drop-shadow-sm"
      >
        {festivalInitials(title)}
      </span>
      {showLabel && (
        <span
          aria-hidden="true"
          className="absolute bottom-2 right-2 rounded-full bg-black/35 px-2 py-0.5 font-ui text-[10px] font-bold uppercase tracking-wider text-white/85 backdrop-blur-xs"
        >
          Photo coming soon
        </span>
      )}
    </div>
  );
}
