"use client";

import { cn } from "@/lib/utils";
import { Bookmark, MapPin } from "lucide-react";
import Link from "next/link";
import { useSchedule } from "@/features/schedule/schedule-context";

export function FeaturedFestivalCard({
  className,
  id,
  title,
  date,
  location,
  description,
  slug,
  bgColor,
  badge,
  isLight,
  showSave = false,
  ...props
}) {
  const { isInSchedule, toggleFestival } = useSchedule();
  const saved = showSave && id ? isInSchedule(id) : false;
  const textColor = isLight ? "text-black" : "text-white";
  const mutedColor = isLight ? "text-black" : "text-white";

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-xl shadow-md",
        className
      )}
      style={{ boxShadow: "0px 4px 15px rgba(0, 0, 0, 0.25)" }}
      {...props}
    >
      <div className="h-[140px] w-full bg-gradient-to-br from-gray-200 to-gray-300 md:h-[200px]" />
      <div
        className="flex h-auto min-h-[190px] flex-col px-4 pb-4 pt-3 md:h-[215px] md:px-[21px] md:pt-[17px]"
        style={{ backgroundColor: bgColor }}
      >
        <h3
          className={`font-heading text-2xl font-bold leading-tight md:text-3xl md:leading-9 ${textColor}`}
        >
          {title}
        </h3>

        <div className={`mt-1 flex flex-wrap items-center gap-2 font-body text-sm md:text-base ${mutedColor}`}>
          {location && (
            <span className="flex items-center gap-[6px]">
              <MapPin className="size-[10px]" />
              {location}
            </span>
          )}
          <span className="inline-block h-4 w-px rotate-90 bg-current" />
          {date && <span>{date}</span>}
        </div>

        {badge && (
          <span className="mt-2 inline-flex w-fit items-center justify-center rounded bg-brand-orange px-[5px] py-0.5 font-body text-xs text-brand-dark">
            {badge}
          </span>
        )}

        {description && (
          <p className={`mt-2 line-clamp-3 max-w-[540px] font-body text-sm leading-[17px] md:text-base md:leading-[19px] ${textColor}`}>
            {description}
          </p>
        )}

        <div className="mt-2 flex items-center gap-2 md:mt-auto">
          {showSave && id && (
            <button
              onClick={() => toggleFestival(id)}
              className={cn(
                "flex h-[36px] items-center gap-2 rounded-[18px] px-4 font-body text-base font-bold transition-colors",
                isLight
                  ? "bg-black/10 text-black hover:bg-black/20"
                  : "bg-white/20 text-white hover:bg-white/30",
                saved && (isLight ? "bg-black/25" : "bg-white/40")
              )}
            >
              <Bookmark className={cn("size-3.5", saved && "fill-current")} />
              {saved ? "Saved" : "Save"}
            </button>
          )}
          <Link
            href={slug ? `/festivals/${slug}` : "#"}
            className="flex h-[36px] items-center justify-center rounded-[18px] bg-accent px-[17px] font-body text-base font-bold text-white"
            style={{ letterSpacing: "-0.198857px" }}
          >
            Quick View
          </Link>
        </div>
      </div>
    </div>
  );
}
