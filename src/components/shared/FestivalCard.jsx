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
  fill = false,
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
        style={{ backgroundColor: bgColor || "var(--brand-teal, #0066FF)" }}
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
          "flex flex-col overflow-hidden rounded-xl",
          fill ? "h-full w-full" : "w-[193px]",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "w-full bg-gradient-to-br from-brand-light-teal to-brand-teal",
            fill ? "h-[160px] md:h-[220px]" : "h-[120px]"
          )}
        />
        <div
          className={cn(
            "flex flex-col gap-0.5 bg-brand-card-bg",
            fill
              ? "flex-1 gap-2 px-5 py-4 md:px-6 md:py-5"
              : "h-[102px] px-[11px] pb-[7px] pt-[13px]"
          )}
        >
          <h3
            className={cn(
              "font-body text-foreground",
              fill
                ? "font-heading text-xl font-bold leading-snug md:text-2xl"
                : "text-base font-normal leading-[19px]"
            )}
          >
            {title}
          </h3>
          {location && (
            <span className="flex items-center gap-[6px] font-body text-sm font-semibold leading-[17px] text-muted-foreground">
              <MapPin className="size-[10px] text-muted-foreground" />
              {location}
            </span>
          )}
          {date && (
            <span className="font-body text-xs font-normal leading-[14px] text-muted-foreground">
              {date}
            </span>
          )}
          {category && (
            <span className="mt-auto font-body text-sm font-semibold leading-[17px] text-muted-foreground">
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
        "group flex flex-col overflow-hidden rounded-xl border-t-4 border-primary bg-white shadow-sm transition-shadow hover:shadow-lg",
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
            <span className="absolute left-2 top-2 rounded-full bg-brand-yellow px-2.5 py-0.5 text-xs font-semibold text-brand-dark">
              {badge}
            </span>
          )}
        </div>
      ) : (
        <div className="relative flex aspect-[4/3] w-full items-center justify-center bg-brand-card-bg">
          <span className="font-ui text-sm text-muted-foreground">Add Photo</span>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-4">
        {category && (
          <span className="w-fit rounded-full bg-brand-yellow px-2.5 py-0.5 font-ui text-xs font-semibold text-brand-dark">
            {category}
          </span>
        )}

        <h3 className="font-heading text-lg font-bold leading-snug text-foreground">
          {title}
        </h3>

        {location && (
          <span className="flex items-center gap-1.5 font-body text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
            {location}
          </span>
        )}
        {date && (
          <span className="flex items-center gap-1.5 font-body text-sm text-muted-foreground">
            <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
            {date}
          </span>
        )}

        {tags && tags.length > 0 && (
          <span className="font-body text-sm font-semibold text-muted-foreground">
            {tags.map((t) => `\u{1F3B5} ${t}`).join(" \u2022 ")}
          </span>
        )}

        <div className="mt-auto flex items-center gap-2.5 pt-3">
          {showSave && id && (
            <button
              onClick={() => toggleFestival(id)}
              className={cn(
                "flex h-9 items-center gap-2 rounded-full border border-primary px-4 font-body text-base font-bold text-primary transition-colors hover:bg-primary/10",
                saved && "bg-primary/10"
              )}
            >
              <Bookmark className={cn("size-3.5", saved && "fill-current")} />
              {saved ? "Saved" : "Save"}
            </button>
          )}

          <Link
            href={slug ? `/festivals/${slug}` : "#"}
            className="flex h-9 items-center gap-2 rounded-full bg-primary px-4 font-body text-base font-bold text-white transition-opacity hover:opacity-90"
          >
            <ArrowRight className="size-3.5 text-white" />
            Learn more
          </Link>
        </div>
      </div>
    </div>
  );
}
