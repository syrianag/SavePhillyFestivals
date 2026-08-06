"use client";

import Link from "next/link";

import { useOnboarding } from "./onboarding-context";

export function CompletionStep() {
  const { answers } = useOnboarding();

  return (
    <div className="flex flex-col items-center gap-8 py-10 text-center">
      <div className="flex size-[72px] items-center justify-center rounded-full bg-[#206C4E]">
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <div className="flex flex-col gap-3">
        <h2
          className="font-heading text-[28px] font-bold leading-tight text-[#0F172B] md:text-[36px]"
          style={{ letterSpacing: "-0.413209px" }}
        >
          Thank You{answers.orgName ? `, ${answers.orgName}` : ""}!
        </h2>
        <p
          className="mx-auto max-w-[480px] font-body text-lg leading-[26px] text-[#45556C]"
          style={{ letterSpacing: "-0.198857px" }}
        >
          Your responses have been received. We&apos;re excited to learn more about
          your festival and explore how Save Philly Festivals can support your
          vision.
        </p>
      </div>

      <div className="rounded-[16px] border border-[#E2E8F0] bg-[#F9F8FD] px-8 py-6 text-left">
        <h4
          className="font-body text-base font-semibold text-[#0F172B]"
          style={{ letterSpacing: "-0.198857px" }}
        >
          What&apos;s next?
        </h4>
        <ul className="mt-3 flex flex-col gap-2">
          <li className="flex items-start gap-2 font-body text-base text-[#45556C]">
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[#1E7BF6]" />
            Explore our resources to plan your event
          </li>
          <li className="flex items-start gap-2 font-body text-base text-[#45556C]">
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[#FE7D0C]" />
            Submit your festival for the calendar
          </li>
          <li className="flex items-start gap-2 font-body text-base text-[#45556C]">
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[#206C4E]" />
            Connect with the Philly festivals community
          </li>
        </ul>
      </div>

      <Link
        href="/"
        className="flex h-[47px] w-[200px] items-center justify-center rounded-[12px] bg-[#206C4E] font-body text-base font-bold leading-[19px] text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#206C4E]"
      >
        Enter the Site
      </Link>
    </div>
  );
}
