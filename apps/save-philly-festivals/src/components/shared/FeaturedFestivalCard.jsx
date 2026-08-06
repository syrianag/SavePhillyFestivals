import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { MapPin, Calendar, ArrowRight } from "lucide-react";

export function FeaturedFestivalCard({
  className,
  slug,
  title,
  date,
  location,
  description,
  bgColor,
  badge,
  isLight,
  image,
  ...props
}) {
  const textColor = isLight ? "text-slate-900" : "text-white";
  const mutedColor = isLight ? "text-slate-500" : "text-white/80";

  return (
    <div
      className={cn(
        "flex w-[min(896px,85vw)] flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-100 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white",
        className
      )}
      {...props}
    >
      {/* Cover Image or fallback premium gradient mesh */}
      <div className="relative h-[160px] w-full md:h-[240px] overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt={title}
            fill
            unoptimized
            className="object-cover transition-transform duration-500 hover:scale-105"
          />
        ) : (
          <div 
            className="absolute inset-0 bg-gradient-to-br" 
            style={{ 
              backgroundImage: `linear-gradient(135deg, ${bgColor}dd, #0f172a)`
            }} 
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent)]" />
          </div>
        )}
        
        {badge && (
          <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 font-ui text-xs font-bold text-slate-950 uppercase tracking-wider shadow-xs border border-amber-300">
            <span className="size-1.5 rounded-full bg-slate-950 animate-pulse" />
            {badge}
          </span>
        )}
      </div>

      {/* Description Content */}
      <div
        className="flex h-auto min-h-[220px] flex-col px-5 pb-5 pt-4 md:h-[260px] md:px-7 md:pt-6"
        style={{ 
          background: `linear-gradient(180deg, ${bgColor}ee 0%, ${bgColor}ff 100%)` 
        }}
      >
        <h3
          className={`font-heading text-2xl font-bold leading-tight md:text-[34px] md:leading-[40px] tracking-tight ${textColor}`}
        >
          {title}
        </h3>

        <div className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-sm font-semibold md:text-base ${mutedColor}`}>
          {location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5 text-inherit" />
              {location}
            </span>
          )}
          {location && date && <span className="inline-block h-3 w-px bg-current opacity-30" />}
          {date && (
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3.5 text-inherit" />
              {date}
            </span>
          )}
        </div>

        {description && (
          <p className={`mt-3 line-clamp-3 max-w-[720px] font-body text-sm leading-relaxed md:text-base ${textColor} opacity-90`}>
            {description}
          </p>
        )}

        <div className="mt-4 flex justify-end md:mt-auto">
          {slug && (
            <Link
              href={`/festivals/${slug}`}
              className="group flex h-[40px] items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 px-5 font-body text-sm font-bold text-white transition-all shadow-xs"
            >
              Learn more
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
