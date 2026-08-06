"use client";

import { useOnboarding } from "./onboarding-context";

export function WelcomeStep() {
  const { start, skip } = useOnboarding();

  return (
    <div className="flex flex-col items-center gap-8 py-10 text-center">
      <div className="flex size-[72px] items-center justify-center rounded-full bg-brand-yellow">
        <span className="font-heading text-3xl font-bold text-brand-dark">?</span>
      </div>

      <div className="flex flex-col gap-3">
        <h2
          className="font-heading text-[28px] font-bold leading-tight text-foreground md:text-[36px]"
          style={{ letterSpacing: "-0.413209px" }}
        >
          Let&apos;s Get to Know You
        </h2>
        <p
          className="mx-auto max-w-[480px] font-body text-lg leading-[26px] text-muted-foreground"
          style={{ letterSpacing: "-0.198857px" }}
        >
          We&apos;d love to learn more about your organization and your festival.
          This quick questionnaire helps us understand how Save Philly Festivals
          can best support you.
        </p>
      </div>

      <p
        className="font-body text-base text-brand-text-gray"
        style={{ letterSpacing: "-0.198857px" }}
      >
        Takes about 2 minutes. You can skip anytime.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={start}
          className="flex h-[47px] w-[180px] items-center justify-center rounded-[12px] bg-black font-body text-base font-bold leading-[19px] text-white transition-opacity hover:opacity-90"
        >
          Let&apos;s Get Started
        </button>
        <button
          onClick={skip}
          className="flex h-[47px] w-[180px] items-center justify-center rounded-[12px] border border-border bg-white font-body text-base font-bold leading-[19px] text-brand-text-gray transition-colors hover:bg-muted"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
