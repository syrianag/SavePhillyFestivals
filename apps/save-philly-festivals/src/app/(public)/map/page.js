import Link from "next/link";
import { AdSlot } from "@/components/shared/AdSlot";
import { SPONSOR_SLOTS } from "@/features/sponsors/sponsor-placements";
import { getPublicFestivalMapPins } from "@/features/festivals/festival-queries";
import { FestivalMap } from "@/features/festivals/FestivalMap";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Festival map - Save Philly Festivals",
  description: "See where festivals are happening across Philadelphia.",
};

export default async function MapPage() {
  const pins = await getPublicFestivalMapPins();

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-8 md:px-8">
      <div>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Festival map
        </h1>
        <p className="mt-2 max-w-2xl font-body text-sm text-slate-600 sm:text-base">
          Every published festival with a known location, plotted across Philadelphia. Select a pin
          to open that festival.
        </p>
      </div>

      <nav aria-label="Discovery views" className="flex items-center gap-4 border-b border-slate-200 pb-3">
        <Link
          href="/"
          className="flex items-center gap-2 pb-2.5 font-ui text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900 md:text-base"
        >
          Featured
        </Link>
        <span
          aria-current="page"
          className="flex items-center gap-2 border-b-2 border-slate-900 pb-2.5 font-ui text-sm font-bold text-slate-900 md:text-base"
        >
          Map
        </span>
        <Link
          href="/calendar"
          className="flex items-center gap-2 pb-2.5 font-ui text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900 md:text-base"
        >
          Calendar
        </Link>
      </nav>

      <FestivalMap pins={pins} />

      <AdSlot
        slot={SPONSOR_SLOTS.FOOTER}
        orientation="horizontal"
        className="mt-2 items-center justify-center"
      />
    </div>
  );
}
