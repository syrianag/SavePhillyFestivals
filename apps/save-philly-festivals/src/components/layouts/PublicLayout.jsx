import { NavBar } from "@/components/shared/NavBar";
import { Footer } from "@/components/shared/Footer";
import { SkipLink } from "@/components/shared/SkipLink";
import { SponsorRail } from "@/components/shared/SponsorRail";
import { SPONSOR_SLOTS } from "@/features/sponsors/sponsor-placements";
import { resolvePublicNavigation } from "@/features/navigation/navigation-source";

/**
 * Chrome for visitor-facing pages: public navigation, sponsor rails, and the footer.
 *
 * Scoped to the `(public)` route group rather than applied at the root. Previously the root
 * layout rendered this for every route and suppressed only the footer when the *viewer* held a
 * staff role — chrome that followed who you were instead of where you were. That produced two
 * navigation bars on admin and producer screens, and it silently dropped the footer and sponsor
 * placements whenever an editor browsed the public site.
 */
export async function PublicLayout({ children }) {
  /* Read here rather than in the root layout: `layout-contract.test.js` keeps the root free of
   * per-request lookups because it runs for every route including static ones. `cache()` inside
   * the source dedupes this single read across the header and the footer. */
  const navigation = await resolvePublicNavigation();

  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <NavBar links={navigation.header} />
      {/* Rails flank the content on wide screens only. They are a sibling of <main> rather
        * than inside it so page containers keep their own max-width, and they collapse to
        * nothing below 2xl — where the footer renders the same sponsors instead. */}
      <div className="flex flex-1 justify-center gap-6">
        <SponsorRail slot={SPONSOR_SLOTS.LEFT_RAIL} className="pt-8" />
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 pb-16">
          {children}
        </main>
        <SponsorRail slot={SPONSOR_SLOTS.RIGHT_RAIL} className="pt-8" />
      </div>
      {/* The footer band carries footer sponsors at every width, plus the rail sponsors
        * below 2xl so a rail advertiser is relocated rather than dropped on mobile. */}
      <Footer sections={navigation.footer} />
    </div>
  );
}
