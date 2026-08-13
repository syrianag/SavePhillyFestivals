"use client";

import { useOnboarding } from "./onboarding-context";
import { ProgressBar } from "./ProgressBar";
import { WelcomeStep } from "./WelcomeStep";
import { OrgInfoStep } from "./OrgInfoStep";
import { FestivalInfoStep } from "./FestivalInfoStep";
import { GetToKnowStep } from "./GetToKnowStep";
import { PainPointsStep } from "./PainPointsStep";
import { SpfStep } from "./SpfStep";
import { CompletionStep } from "./CompletionStep";

function validateStep(step, answers) {
  const errors = {};
  if (step === 1) {
    if (!answers.orgName) errors.orgName = true;
    if (!answers.contactName) errors.contactName = true;
    if (!answers.email) errors.email = true;
    if (answers.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email)) errors.email = true;
    if (!answers.phone) errors.phone = true;
  }
  if (step === 2) {
    if (!answers.festivalDuration) errors.festivalDuration = true;
    if (answers.festivalType.length === 0) errors.festivalType = true;
  }
  if (step === 4) {
    if (answers.challenges.length === 0) errors.challenges = true;
  }
  if (step === 5) {
    if (!answers.heardOfSpf) errors.heardOfSpf = true;
    if (!answers.marketingTool) errors.marketingTool = true;
  }
  return errors;
}

export function OnboardingQuestionnaire() {
  const {
    currentStep,
    totalSteps,
    answers,
    nextStep,
    prevStep,
    skip,
  } = useOnboarding();

  const errors = validateStep(currentStep, answers);
  const hasErrors = Object.keys(errors).length > 0;

  function handleNext() {
    if (!hasErrors) {
      nextStep();
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
      handleNext();
    }
  }

  return (
    <div
      className="w-full bg-white md:w-[822.8px]"
      style={{ border: "1px solid var(--border)", borderRadius: "22px" }}
      onKeyDown={handleKeyDown}
    >
      <div className="px-10 pb-[18px] pt-[50px]">
        {currentStep === 0 && <WelcomeStep />}

        {currentStep >= 1 && currentStep <= totalSteps && (
          <>
            <ProgressBar currentStep={currentStep} />

            <div className="flex w-full flex-col gap-[31.73px]">
              {currentStep === 1 && <OrgInfoStep />}
              {currentStep === 2 && <FestivalInfoStep />}
              {currentStep === 3 && <GetToKnowStep />}
              {currentStep === 4 && <PainPointsStep />}
              {currentStep === 5 && <SpfStep />}
            </div>

            <div className="mt-[31.73px] flex items-center justify-between border-t pt-6" style={{ borderTopColor: "var(--border)" }}>
              {currentStep > 1 ? (
                <button
                  onClick={prevStep}
                  className="flex h-[47px] w-[120px] items-center justify-center rounded-[12px] border border-border bg-white font-body text-base font-bold leading-[19px] text-brand-text-gray transition-colors hover:bg-muted"
                >
                  Back
                </button>
              ) : (
                <button
                  onClick={skip}
                  className="font-body text-base font-semibold text-brand-text-gray underline-offset-4 hover:underline"
                  style={{ letterSpacing: "-0.198857px" }}
                >
                  Skip for now
                </button>
              )}

              <button
                onClick={handleNext}
                disabled={hasErrors}
                className="flex h-[47px] w-[142px] items-center justify-center rounded-[12px] bg-black font-body text-base font-bold leading-[19px] text-white disabled:opacity-40"
                style={{ textAlign: "center" }}
              >
                {currentStep === totalSteps ? "Finish" : "Continue"}
              </button>
            </div>

            {hasErrors && (
              <p
                role="alert"
                aria-live="polite"
                className="mt-4 text-center font-body text-sm text-brand-coral"
                style={{ letterSpacing: "-0.198857px" }}
              >
                Please fill in all required fields to continue.
              </p>
            )}
          </>
        )}

        {currentStep > totalSteps && <CompletionStep />}
      </div>
    </div>
  );
}
