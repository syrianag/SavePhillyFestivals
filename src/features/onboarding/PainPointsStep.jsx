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
          className="font-heading text-[22px] font-semibold leading-[32px] text-[#0F172B]"
          style={{ letterSpacing: "-0.413209px" }}
        >
          Pain Points
        </h3>
        <p
          className="mt-1 font-body text-base leading-[22px] text-[#45556C]"
          style={{ letterSpacing: "-0.198857px" }}
        >
          Understanding your challenges helps us build better solutions for you.
        </p>
      </div>

      <div className="flex flex-col gap-[10px]">
        <label
          className="font-body text-lg font-semibold leading-[19px] text-[#0A0A0A]"
          style={{ letterSpacing: "-0.198857px" }}
        >
          What are the biggest challenges you currently face? <span className="text-[#FF7261]">*</span>
        </label>
        <p
          className="font-body text-base leading-[22px] text-[#848484]"
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
                  ? "border-transparent bg-[#FE7D0C] text-white"
                  : "border-[#CAD5E2] bg-white text-[#0A0A0A] hover:border-[#848484]"
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
