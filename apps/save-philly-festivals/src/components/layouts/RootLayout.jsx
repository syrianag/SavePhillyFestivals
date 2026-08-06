import { NavBar } from "@/components/shared/NavBar";
import { Footer } from "@/components/shared/Footer";
import { AdSlot } from "@/components/shared/AdSlot";
import { SPONSOR_SLOTS } from "@/features/sponsors/sponsor-placements";

export function RootLayout({ children, isStaff }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-md bg-white px-4 py-2 font-ui font-bold text-black shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-black"
      >
        Skip to main content
      </a>
      <NavBar />
      {/* Sponsor rails follow the same public/staff split the footer already uses, so they
        * appear on every visitor-facing page (home, festivals, and the (public) group) and
        * on none of the admin screens. Rails are desktop-only: side ads on a phone would
        * overwhelm the page, which the client explicitly did not want. Each slot renders
        * nothing when unsold, so this adds no empty chrome. */}
      <div className="flex w-full min-w-0 flex-1 justify-center gap-6 px-0 xl:px-6">
        {!isStaff && (
          <AdSlot slot={SPONSOR_SLOTS.LEFT_RAIL} className="sticky top-24 hidden h-fit w-40 shrink-0 py-8 xl:flex" />
        )}
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 pb-16">
          {children}
        </main>
        {!isStaff && (
          <AdSlot slot={SPONSOR_SLOTS.RIGHT_RAIL} className="sticky top-24 hidden h-fit w-40 shrink-0 py-8 xl:flex" />
        )}
      </div>
      {!isStaff && (
        <AdSlot
          slot={SPONSOR_SLOTS.FOOTER}
          orientation="horizontal"
          className="mx-auto w-full max-w-[1440px] px-4 pb-10 md:px-8"
        />
      )}
      {!isStaff && <Footer />}
    </div>
  );
}
