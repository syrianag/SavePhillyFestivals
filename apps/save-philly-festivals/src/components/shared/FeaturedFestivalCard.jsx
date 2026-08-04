import { cn } from "@/lib/utils";
import { Calendar, MapPin } from "lucide-react";

export function FeaturedFestivalCard({
  className,
  title,
  date,
  location,
  description,
  bgColor,
  badge,
  isLight,
  ...props
}) {
  const textColor = isLight ? "text-black" : "text-white";
  const mutedColor = isLight ? "text-black" : "text-white";

  return (
    <div
      className={cn(
        "flex w-[min(896px,85vw)] flex-shrink-0 flex-col overflow-hidden rounded-xl shadow-md",
        className
      )}
      style={{ boxShadow: "0px 4px 15px rgba(0, 0, 0, 0.25)" }}
      {...props}
    >
      <div className="h-[140px] w-full bg-gradient-to-br from-gray-200 to-gray-300 md:h-[230px]" />
      <div
        className="flex h-auto min-h-[200px] flex-col px-4 pb-4 pt-3 md:h-[241px] md:px-[21px] md:pt-[17px]"
        style={{ backgroundColor: bgColor }}
      >
        <h3
          className={`font-heading text-2xl font-bold leading-tight md:text-[40px] md:leading-[47px] ${textColor}`}
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
          <span className="mt-2 inline-flex w-fit items-center justify-center rounded bg-[#FE7D0C] px-[5px] py-0.5 font-body text-xs text-[#1E1E1E]">
            {badge}
          </span>
        )}

        {description && (
          <p className={`mt-2 line-clamp-3 max-w-[630px] font-body text-sm leading-[17px] md:text-base md:leading-[19px] ${textColor}`}>
            {description}
          </p>
        )}

        <div className="mt-2 flex justify-end md:mt-auto">
          <button
            className="flex h-[36px] items-center justify-center rounded-[18px] bg-[#FB439B] px-[17px] font-body text-base font-bold text-white"
            style={{ letterSpacing: "-0.198857px" }}
          >
            Learn more
          </button>
        </div>
      </div>
    </div>
  );
}
