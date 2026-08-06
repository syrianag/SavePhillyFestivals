"use client";

import { useOnboarding } from "./onboarding-context";

export function CompletionStep() {
  const { answers } = useOnboarding();

  return (
    <div className="flex flex-col items-center gap-8 py-10 text-center">
      <div className="flex size-[72px] items-center justify-center rounded-full bg-secondary">
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1A1A1A"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <div className="flex flex-col gap-3">
        <h2
          className="font-heading text-[28px] font-bold leading-tight text-foreground md:text-[36px]"
          style={{ letterSpacing: "-0.413209px" }}
        >
          Thank You{answers.orgName ? `, ${answers.orgName}` : ""}!
        </h2>
        <p
          className="mx-auto max-w-[480px] font-body text-lg leading-[26px] text-muted-foreground"
          style={{ letterSpacing: "-0.198857px" }}
        >
          Your responses have been received. We&apos;re excited to learn more about
          your festival and explore how Save Philly Festivals can support your
          vision.
        </p>
      </div>

      <div className="rounded-[16px] border border-border bg-muted px-8 py-6 text-left">
        <h4
          className="font-body text-base font-semibold text-foreground"
          style={{ letterSpacing: "-0.198857px" }}
        >
          What&apos;s next?
        </h4>
        <ul className="mt-3 flex flex-col gap-2">
          <li className="flex items-start gap-2 font-body text-base text-muted-foreground">
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
            Explore our resources to plan your event
          </li>
          <li className="flex items-start gap-2 font-body text-base text-muted-foreground">
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand-orange" />
            Submit your festival for the calendar
          </li>
          <li className="flex items-start gap-2 font-body text-base text-muted-foreground">
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-secondary" />
            Connect with the Philly festivals community
          </li>
        </ul>
      </div>

      <button
        onClick={() => { window.location.href = "/"; }}
        className="flex h-[47px] w-[200px] items-center justify-center rounded-[12px] bg-secondary font-body text-base font-bold leading-[19px] text-brand-dark transition-opacity hover:opacity-90"
      >
        Enter the Site
      </button>
    </div>
  );
}
