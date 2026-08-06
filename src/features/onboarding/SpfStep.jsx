"use client";

import { cn } from "@/lib/utils";
import { useOnboarding } from "./onboarding-context";
import { QuestionnaireField } from "./QuestionnaireField";

const HEARD_OPTIONS = ["Yes", "No"];
const MARKETING_OPTIONS = ["Yes", "No", "Not Sure"];

export function SpfStep() {
  const { answers, setAnswer } = useOnboarding();

  return (
    <div className="flex flex-col gap-[31.73px]">
      <div>
        <h3
          className="font-heading text-[22px] font-semibold leading-[32px] text-foreground"
          style={{ letterSpacing: "-0.413209px" }}
        >
          About Save Philly Festivals
        </h3>
        <p
          className="mt-1 font-body text-base leading-[22px] text-muted-foreground"
          style={{ letterSpacing: "-0.198857px" }}
        >
          Help us understand how we can best serve your organization.
        </p>
      </div>

      <div className="flex flex-col gap-[10px]">
        <label
          className="font-body text-lg font-semibold leading-[19px] text-foreground"
          style={{ letterSpacing: "-0.198857px" }}
        >
          Before today, had you heard of Save Philly Festivals? <span className="text-brand-coral">*</span>
        </label>
        <div
          role="radiogroup"
          aria-label="Heard of Save Philly Festivals"
          className="flex gap-3"
        >
          {HEARD_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={answers.heardOfSpf === opt}
              onClick={() => setAnswer("heardOfSpf", opt)}
              className={cn(
                "rounded-full border px-5 py-2.5 font-body text-base font-semibold transition-colors",
                answers.heardOfSpf === opt
                  ? "border-transparent bg-secondary text-brand-dark"
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
        label="What do you hope Save Philly Festivals can help you accomplish?"
        name="hopeToAccomplish"
        type="textarea"
        placeholder="Share your hopes and expectations..."
        value={answers.hopeToAccomplish}
        onChange={(v) => setAnswer("hopeToAccomplish", v)}
        rows={4}
      />

      <div className="flex flex-col gap-[10px]">
        <label
          className="font-body text-lg font-semibold leading-[19px] text-foreground"
          style={{ letterSpacing: "-0.198857px" }}
        >
          Do you believe Save Philly Festivals can serve as a marketing tool for your organization? <span className="text-brand-coral">*</span>
        </label>
        <div
          role="radiogroup"
          aria-label="Marketing tool potential"
          className="flex gap-3"
        >
          {MARKETING_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={answers.marketingTool === opt}
              onClick={() => setAnswer("marketingTool", opt)}
              className={cn(
                "rounded-full border px-5 py-2.5 font-body text-base font-semibold transition-colors",
                answers.marketingTool === opt
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

      <QuestionnaireField
        label="Are there any features or resources you would like Save Philly Festivals to provide?"
        name="desiredFeatures"
        type="textarea"
        placeholder="Share any ideas or features you'd find valuable..."
        value={answers.desiredFeatures}
        onChange={(v) => setAnswer("desiredFeatures", v)}
        rows={4}
      />
    </div>
  );
}
