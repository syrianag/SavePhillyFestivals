"use client";

import { cn } from "@/lib/utils";
import { Bookmark, Calendar, MapPin, ArrowRight, X } from "lucide-react";
import { useSchedule } from "@/features/schedule/schedule-context";
import Link from "next/link";

function getTextColorForBg(bgColor) {
  if (!bgColor) return "#000000";
  const hex = bgColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

export function FestivalCard({
  className,
  variant = "default",
  id,
  image,
  title,
  date,
  location,
  category,
  badge,
  bgColor,
  tags,
  slug,
  onRemove,
  showSave = false,
  ...props
}) {
  const { isInSchedule, toggleFestival } = useSchedule();
  const saved = showSave && id ? isInSchedule(id) : false;

  if (variant === "schedule") {
    const textColor = getTextColorForBg(bgColor);
    return (
      <div
        data-slot="festival-schedule-pill"
        className={cn(
          "flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5",
          className
        )}
        style={{ backgroundColor: bgColor || "#1E7BF6" }}
        {...props}
      >
        <span
          className="truncate font-body text-lg font-bold"
          style={{ color: textColor }}
        >
          {title}
        </span>
        {onRemove && (
          <button
            onClick={() => onRemove(id)}
            className="ml-2 flex size-4 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-70"
            aria-label={`Remove ${title}`}
          >
            <X className="size-4" style={{ color: textColor }} />
          </button>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        data-slot="festival-card"
        className={cn(
          "flex w-[193px] flex-col overflow-hidden rounded-xl",
          className
        )}
        {...props}
      >
        <div className="h-[120px] w-full bg-gradient-to-br from-brand-light-teal to-brand-teal" />
        <div className="flex h-[102px] flex-col gap-0.5 bg-[#EBEBEB] px-[11px] pb-[7px] pt-[13px]">
          <h3 className="font-body text-base font-normal leading-[19px] text-black">
            {title}
          </h3>
          {location && (
            <span className="flex items-center gap-[6px] font-body text-sm font-semibold leading-[17px] text-[#848484]">
              <MapPin className="size-[10px] text-[#848484]" />
              {location}
            </span>
          )}
          {date && (
            <span className="font-body text-xs font-normal leading-[14px] text-[#848484]">
              {date}
            </span>
          )}
          {category && (
            <span className="mt-auto font-body text-sm font-semibold leading-[17px] text-[#848484]">
              {category}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      data-slot="festival-card"
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl",
        className
      )}
      {...props}
    >
      {image ? (
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {badge && (
            <span className="absolute left-2 top-2 rounded bg-brand-yellow px-2 py-0.5 text-xs font-semibold text-brand-dark">
              {badge}
            </span>
          )}
        </div>
      ) : (
        <div className="relative flex h-[120px] w-full items-center justify-center bg-[#E8E6E1]">
          <span className="font-ui text-sm text-[#848484]">Add Photo</span>
        </div>
      )}

      <div
        className="flex flex-1 flex-col gap-2.5 px-[26px] py-2.5"
        style={{ backgroundColor: bgColor || "#1E7BF6" }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-[18px]">
            <h3
              className="font-body text-lg font-bold leading-[22px]"
              style={{ color: getTextColorForBg(bgColor) }}
            >
              {title}
            </h3>

            <div className="flex flex-col gap-2">
              {location && (
                <span
                  className="flex items-center gap-1.5 font-body text-sm font-bold leading-[17px]"
                  style={{ color: getTextColorForBg(bgColor) }}
                >
                  <MapPin className="size-2.5" style={{ color: getTextColorForBg(bgColor) }} />
                  {location}
                </span>
              )}
              {date && (
                <span
                  className="font-body text-sm font-light leading-[17px]"
                  style={{ color: getTextColorForBg(bgColor) }}
                >
                  {date}
                </span>
              )}
            </div>

            {tags && tags.length > 0 && (
              <span
                className="font-body text-sm font-semibold leading-[17px]"
                style={{ color: getTextColorForBg(bgColor) }}
              >
                {tags.map((t) => `\u{1F3B5} ${t}`).join(" \u2022 ")}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {showSave && id && (
              <button
                onClick={() => toggleFestival(id)}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-full px-4 font-body text-base font-bold transition-colors",
                  saved
                    ? "border border-white bg-transparent text-white"
                    : "bg-black text-white"
                )}
              >
                <Bookmark
                  className="size-3.5 fill-current"
                  style={{ color: saved ? "#FFFFFF" : "#FFFFFF" }}
                />
                {saved ? "Saved" : "Save"}
              </button>
            )}

            <Link
              href={slug ? `/festivals/${slug}` : "#"}
              className="flex h-9 items-center gap-2 rounded-full bg-[#FF7261] px-4 font-body text-base font-bold text-white transition-opacity hover:opacity-90"
            >
              <ArrowRight className="size-3.5 text-white" />
              Learn more
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
