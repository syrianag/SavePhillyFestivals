import { cn } from "@/lib/utils";
import { Calendar, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function FestivalCard({
  className,
  variant = "default",
  image,
  title,
  date,
  location,
  category,
  badge,
  slug,
  ...props
}) {
  const href = slug ? `/festivals/${slug}` : "#";

  if (variant === "compact") {
    return (
      <Link href={href}>
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
      </Link>
    );
  }

  return (
    <Link href={href}>
      <div
        data-slot="festival-card"
        className={cn(
          "group flex flex-col overflow-hidden rounded-xl bg-card text-sm text-card-foreground shadow-sm ring-1 ring-foreground/10",
          className
        )}
        {...props}
      >
        {image && (
          <div className="relative aspect-[4/3] overflow-hidden">
            <Image
              src={image}
              alt={title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {badge && (
              <span className="absolute left-2 top-2 rounded bg-brand-yellow px-2 py-0.5 text-xs font-semibold text-brand-dark">
                {badge}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-1 flex-col gap-2 p-4">
          {category && (
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-brand-text-muted">
              {category}
            </span>
          )}

          <h3 className="font-heading text-base font-semibold leading-snug text-foreground">
            {title}
          </h3>

          <div className="mt-auto flex flex-col gap-1.5 pt-2">
            {date && (
              <span className="flex items-center gap-1.5 font-body text-xs text-brand-text-muted">
                <Calendar className="size-3.5" />
                {date}
              </span>
            )}
            {location && (
              <span className="flex items-center gap-1.5 font-body text-xs text-brand-text-muted">
                <MapPin className="size-3.5" />
                {location}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
