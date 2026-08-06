"use client";

import { cn } from "@/lib/utils";
import { useOnboarding } from "./onboarding-context";

const DURATION_OPTIONS = [
  "Less than 1 year",
  "1\u20133 years",
  "4\u201310 years",
  "10+ years",
];

const TYPE_OPTIONS = [
  "Music",
  "Food & Drink",
  "Cultural",
  "Arts & Crafts",
  "Film",
  "Family",
  "Multi-Genre",
  "Other",
];

export function FestivalInfoStep() {
  const { answers, setAnswer, toggleArrayItem } = useOnboarding();

  return (
    <div className="flex flex-col gap-[31.73px]">
      <div>
        <h3
          className="font-heading text-[22px] font-semibold leading-[32px] text-foreground"
          style={{ letterSpacing: "-0.413209px" }}
        >
          Festival Information
        </h3>
        <p
          className="mt-1 font-body text-base leading-[22px] text-muted-foreground"
          style={{ letterSpacing: "-0.198857px" }}
        >
          Help us understand the scope and nature of your event.
        </p>
      </div>

      <div className="flex flex-col gap-[10px]">
        <label
          className="font-body text-lg font-semibold leading-[19px] text-foreground"
          style={{ letterSpacing: "-0.198857px" }}
        >
          How long has your festival been active? <span className="text-brand-coral">*</span>
        </label>
        <div
          role="radiogroup"
          aria-label="Festival duration"
          className="flex flex-wrap gap-3"
        >
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={answers.festivalDuration === opt}
              onClick={() => setAnswer("festivalDuration", opt)}
              className={cn(
                "rounded-full border px-5 py-2.5 font-body text-base font-semibold transition-colors",
                answers.festivalDuration === opt
                  ? "border-transparent bg-brand-dark text-white"
                  : "border-border bg-white text-foreground hover:border-brand-text-gray"
              )}
              style={{ letterSpacing: "-0.198857px" }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-[10px]">
        <label
          className="font-body text-lg font-semibold leading-[19px] text-foreground"
          style={{ letterSpacing: "-0.198857px" }}
        >
          What type of festival do you organize? <span className="text-brand-coral">*</span>
        </label>
        <div
          role="group"
          aria-label="Festival type"
          className="flex flex-wrap gap-3"
        >
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              aria-pressed={answers.festivalType.includes(opt)}
              onClick={() => toggleArrayItem("festivalType", opt)}
              className={cn(
                "rounded-full border px-5 py-2.5 font-body text-base font-semibold transition-colors",
                answers.festivalType.includes(opt)
                  ? "border-transparent bg-primary text-white"
                  : "border-border bg-white text-foreground hover:border-brand-text-gray"
              )}
              style={{ letterSpacing: "-0.198857px" }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
