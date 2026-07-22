"use client";

import { useOnboarding } from "./onboarding-context";
import { QuestionnaireField } from "./QuestionnaireField";

export function GetToKnowStep() {
  const { answers, setAnswer } = useOnboarding();

  return (
    <div className="flex flex-col gap-[31.73px]">
      <div>
        <h3
          className="font-heading text-[22px] font-semibold leading-[32px] text-[#0F172B]"
          style={{ letterSpacing: "-0.413209px" }}
        >
          Get to Know You
        </h3>
        <p
          className="mt-1 font-body text-base leading-[22px] text-[#45556C]"
          style={{ letterSpacing: "-0.198857px" }}
        >
          We&apos;d love to hear your story. Share as much or as little as you&apos;d like.
        </p>
      </div>

      <QuestionnaireField
        label="What inspired you to start your festival?"
        name="inspiration"
        type="textarea"
        placeholder="Tell us about the spark that started it all..."
        value={answers.inspiration}
        onChange={(v) => setAnswer("inspiration", v)}
        rows={4}
      />

      <QuestionnaireField
        label="What impact does your festival have on your community?"
        name="communityImpact"
        type="textarea"
        placeholder="How does your event bring people together..."
        value={answers.communityImpact}
        onChange={(v) => setAnswer("communityImpact", v)}
        rows={4}
      />

      <QuestionnaireField
        label="What are your biggest goals over the next few years?"
        name="goals"
        type="textarea"
        placeholder="Where do you see your festival heading..."
        value={answers.goals}
        onChange={(v) => setAnswer("goals", v)}
        rows={4}
      />
    </div>
  );
}
