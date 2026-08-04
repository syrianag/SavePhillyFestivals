"use client";

import { useOnboarding } from "./onboarding-context";
import { QuestionnaireField } from "./QuestionnaireField";

export function OrgInfoStep() {
  const { answers, setAnswer } = useOnboarding();

  return (
    <div className="flex flex-col gap-[31.73px]">
      <div>
        <h3
          className="font-heading text-[22px] font-semibold leading-[32px] text-[#0F172B]"
          style={{ letterSpacing: "-0.413209px" }}
        >
          Organization Information
        </h3>
        <p
          className="mt-1 font-body text-base leading-[22px] text-[#45556C]"
          style={{ letterSpacing: "-0.198857px" }}
        >
          Tell us about your organization so we can personalize your experience.
        </p>
      </div>

      <QuestionnaireField
        label="Organization / Festival Name"
        name="orgName"
        placeholder="e.g., Philly Summer Music Fest"
        required
        value={answers.orgName}
        onChange={(v) => setAnswer("orgName", v)}
        error={!answers.orgName ? "Organization name is required" : ""}
      />

      <QuestionnaireField
        label="Primary Contact Name"
        name="contactName"
        placeholder="e.g., Jane Smith"
        required
        value={answers.contactName}
        onChange={(v) => setAnswer("contactName", v)}
        error={!answers.contactName ? "Contact name is required" : ""}
      />

      <div className="flex flex-col gap-5 md:flex-row md:gap-5">
        <QuestionnaireField
          label="Email Address"
          name="email"
          type="email"
          placeholder="e.g., jane@phillyfest.com"
          required
          value={answers.email}
          onChange={(v) => setAnswer("email", v)}
          error={
            !answers.email
              ? "Email is required"
              : answers.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email)
                ? "Please enter a valid email"
                : ""
          }
          className="md:w-1/2"
        />
        <QuestionnaireField
          label="Phone Number"
          name="phone"
          type="tel"
          placeholder="e.g., (215) 555-0123"
          required
          value={answers.phone}
          onChange={(v) => setAnswer("phone", v)}
          error={!answers.phone ? "Phone number is required" : ""}
          className="md:w-1/2"
        />
      </div>

      <div className="flex flex-col gap-5 md:flex-row md:gap-5">
        <QuestionnaireField
          label="Website"
          name="website"
          type="url"
          placeholder="https:// (optional)"
          value={answers.website}
          onChange={(v) => setAnswer("website", v)}
          className="md:w-1/2"
        />
        <QuestionnaireField
          label="Social Media"
          name="socialMedia"
          placeholder="e.g., @phillyfest on Instagram (optional)"
          value={answers.socialMedia}
          onChange={(v) => setAnswer("socialMedia", v)}
          className="md:w-1/2"
        />
      </div>
    </div>
  );
}
