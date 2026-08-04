"use client";

import { useOnboarding } from "./onboarding-context";

export function WelcomeStep() {
  const { start, skip } = useOnboarding();

  return (
    <div className="flex flex-col items-center gap-8 py-10 text-center">
      <div className="flex size-[72px] items-center justify-center rounded-full bg-[#F6C847]">
        <span className="font-heading text-3xl font-bold text-black">?</span>
      </div>

      <div className="flex flex-col gap-3">
        <h2
          className="font-heading text-[28px] font-bold leading-tight text-[#0F172B] md:text-[36px]"
          style={{ letterSpacing: "-0.413209px" }}
        >
          Let&apos;s Get to Know You
        </h2>
        <p
          className="mx-auto max-w-[480px] font-body text-lg leading-[26px] text-[#45556C]"
          style={{ letterSpacing: "-0.198857px" }}
        >
          We&apos;d love to learn more about your organization and your festival.
          This quick questionnaire helps us understand how Save Philly Festivals
          can best support you.
        </p>
      </div>

      <p
        className="font-body text-base text-[#848484]"
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
          className="flex h-[47px] w-[180px] items-center justify-center rounded-[12px] border border-[#E2E8F0] bg-white font-body text-base font-bold leading-[19px] text-[#848484] transition-colors hover:bg-[#F9F8FD]"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
