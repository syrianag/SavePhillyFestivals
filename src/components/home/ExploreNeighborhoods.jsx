"use client";

import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/home/SectionHeading";
import { Reveal } from "@/components/home/Reveal";

export function ExploreNeighborhoods({ neighborhoods, onSelectArea }) {
  return (
    <section className="bg-background py-16 md:py-24">
      <div className="mx-auto max-w-[1440px] px-4 md:px-[81px]">
        <Reveal>
          <SectionHeading
            eyebrow="Explore"
            title="Explore by neighborhood"
            description="Every corner of Philadelphia has its own rhythm. Pick a neighborhood and see what's happening nearby."
          />
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 md:mt-14 lg:grid-cols-4">
          {neighborhoods.map((neighborhood, i) => (
            <Reveal key={neighborhood.name} delay={i * 60}>
              <button
                type="button"
                onClick={() => onSelectArea(neighborhood.name)}
                className="group flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-shadow hover:shadow-lg"
              >
                <div
                  className="flex h-40 items-center justify-center overflow-hidden md:h-48"
                  style={{
                    background: `linear-gradient(135deg, ${neighborhood.color}22, ${neighborhood.color}55)`,
                  }}
                >
                  <span className="font-ui text-sm font-medium text-brand-text-gray">
                    Add Photo
                  </span>
                </div>
                <div className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="font-heading text-lg font-bold text-foreground">
                      {neighborhood.name}
                    </h3>
                    <p className="mt-0.5 font-body text-sm text-muted-foreground">
                      {neighborhood.count} festivals
                    </p>
                  </div>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-transform group-hover:translate-x-0.5">
                    <ArrowRight className="size-4" />
                  </span>
                </div>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
