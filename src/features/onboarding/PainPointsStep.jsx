"use client";

import { cn } from "@/lib/utils";
import { useOnboarding } from "./onboarding-context";
import { QuestionnaireField } from "./QuestionnaireField";

const CHALLENGE_OPTIONS = [
  "Marketing",
  "Funding",
  "Finding Vendors",
  "Finding Sponsors",
  "Volunteer Recruitment",
  "Event Planning",
  "Attendance",
  "Permits",
  "Other",
];

export function PainPointsStep() {
  const { answers, toggleArrayItem, setAnswer } = useOnboarding();

  return (
    <div className="flex flex-col gap-[31.73px]">
      <div>
        <h3
          className="font-heading text-[22px] font-semibold leading-[32px] text-foreground"
          style={{ letterSpacing: "-0.413209px" }}
        >
          Pain Points
        </h3>
        <p
          className="mt-1 font-body text-base leading-[22px] text-muted-foreground"
          style={{ letterSpacing: "-0.198857px" }}
        >
          Understanding your challenges helps us build better solutions for you.
        </p>
      </div>

      <div className="flex flex-col gap-[10px]">
        <label
          className="font-body text-lg font-semibold leading-[19px] text-foreground"
          style={{ letterSpacing: "-0.198857px" }}
        >
          What are the biggest challenges you currently face? <span className="text-brand-coral">*</span>
        </label>
        <p
          className="font-body text-base leading-[22px] text-brand-text-gray"
          style={{ letterSpacing: "-0.198857px" }}
        >
          Select all that apply
        </p>
        <div
          role="group"
          aria-label="Challenges"
          className="flex flex-wrap gap-3"
        >
          {CHALLENGE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              aria-pressed={answers.challenges.includes(opt)}
              onClick={() => toggleArrayItem("challenges", opt)}
              className={cn(
                "rounded-full border px-5 py-2.5 font-body text-base font-semibold transition-colors",
                answers.challenges.includes(opt)
                  ? "border-transparent bg-brand-orange text-brand-dark"
                  : "border-border bg-white text-foreground hover:border-brand-text-gray"
              )}
              style={{ letterSpacing: "-0.198857px" }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <QuestionnaireField
        label="If you could solve one problem today, what would it be?"
        name="solveOneProblem"
        type="textarea"
        placeholder="Tell us about your most pressing need..."
        value={answers.solveOneProblem}
        onChange={(v) => setAnswer("solveOneProblem", v)}
        rows={4}
      />
    </div>
  );
}
