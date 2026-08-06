import { cn } from "@/lib/utils";

export function SectionHeading({ eyebrow, title, description, align = "center", className }) {
  return (
    <div
      className={cn(
        "mx-auto max-w-4xl",
        align === "center" ? "text-center" : "text-left",
        className
      )}
    >
      {eyebrow && (
        <span className="inline-block rounded-full bg-brand-yellow/25 px-4 py-1.5 font-ui text-sm font-semibold text-brand-dark">
          {eyebrow}
        </span>
      )}
      <h2 className="mt-4 font-heading text-3xl font-bold leading-tight text-foreground md:text-[40px] md:leading-[47px]">
        {title}
      </h2>
      {description && (
        <p className="mt-4 font-serif text-xl leading-snug text-muted-foreground md:mt-6 md:text-[28px] md:leading-[34px]">
          {description}
        </p>
      )}
    </div>
  );
}
