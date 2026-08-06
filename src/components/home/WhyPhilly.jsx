import { Sparkles, BellRing, HeartHandshake, Globe } from "lucide-react";
import { SectionHeading } from "@/components/home/SectionHeading";
import { Reveal } from "@/components/home/Reveal";

const features = [
  {
    icon: Sparkles,
    title: "Discover hidden local festivals",
    description:
      "Find neighborhood gems and intimate community celebrations you won't see anywhere else.",
    tint: "bg-primary/10 text-primary",
  },
  {
    icon: BellRing,
    title: "Never miss community events",
    description:
      "Save festivals to your schedule and get reminders so the celebrations never slip by.",
    tint: "bg-accent/10 text-accent",
  },
  {
    icon: HeartHandshake,
    title: "Support neighborhood organizations",
    description:
      "Every visit helps the local groups, vendors, and artists who make Philly festivals happen.",
    tint: "bg-secondary/15 text-green-600",
  },
  {
    icon: Globe,
    title: "Explore Philadelphia year-round",
    description:
      "From summer block parties to holiday markets, there's always a reason to celebrate.",
    tint: "bg-brand-yellow/25 text-yellow-600",
  },
];

export function WhyPhilly() {
  return (
    <section className="bg-background py-16 md:py-24">
      <div className="mx-auto max-w-[1440px] px-4 md:px-[81px]">
        <Reveal>
          <SectionHeading
            eyebrow="Why"
            title="Why Save Philly Festivals?"
            description="One place for the festivals, food, and community experiences that make Philadelphia shine."
          />
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 md:mt-14 lg:grid-cols-4">
          {features.map((feature, i) => (
            <Reveal key={feature.title} delay={i * 80}>
              <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-lg">
                <div
                  className={feature.tint}
                  style={{
                    display: "inline-flex",
                    width: "3rem",
                    height: "3rem",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "1rem",
                  }}
                >
                  <feature.icon className="size-6" />
                </div>
                <h3 className="mt-4 font-heading text-xl font-bold leading-snug text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 font-body text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
