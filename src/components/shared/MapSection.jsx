"use client";

import { FestivalCard } from "@/components/shared/FestivalCard";
import { MapPin } from "lucide-react";

export function MapSection({ festivals }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="relative h-[300px] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-gray-100 to-gray-300 md:h-[541px]">
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-center text-[#848484]">
            <MapPin className="size-8" />
            <span className="font-body text-sm">Interactive Map</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 md:gap-10">
        {festivals.length > 0 ? (
          festivals.slice(0, 6).map((festival) => (
            <FestivalCard
              key={festival.id}
              variant="compact"
              slug={festival.slug}
              title={festival.title}
              date={festival.date}
              location={festival.location}
              category={festival.category}
              badge={festival.badge}
            />
          ))
        ) : (
          <p className="py-8 font-body text-[#848484]">
            No festivals found matching your filters.
          </p>
        )}
      </div>
    </div>
  );
}
