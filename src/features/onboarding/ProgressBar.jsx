"use client";

import { cn } from "@/lib/utils";

const STEPS = [
  { num: 1, label: "Org Info" },
  { num: 2, label: "Festival" },
  { num: 3, label: "Your Story" },
  { num: 4, label: "Challenges" },
  { num: 5, label: "About SPF" },
];

export function ProgressBar({ currentStep }) {
  const activeIndex = currentStep - 1;

  return (
    <div className="relative mx-auto mb-10 h-[86.45px] w-full max-w-[640.73px]">
      {STEPS.map((step, i) => {
        const circleLeft = [69.98, 253.32, 447.32, 636.03][i];
        const labelLeft = [50.03, 243.08, 440.69, 626.69][i];
        const isActive = i <= activeIndex;
        const isCurrent = i === activeIndex;
        return (
          <div key={step.num}>
            {i < 4 && (
              <div
                className="absolute top-[19px] h-[5px]"
                style={{
                  left: `${circleLeft + 52.88}px`,
                  width: "111px",
                  backgroundColor: i < activeIndex ? "#1A1A1A" : "#E5E7EB",
                }}
              />
            )}
            <div
              className="absolute flex items-center justify-center"
              style={{
                left: `${circleLeft}px`,
                top: "0px",
                width: "42.31px",
                height: "42.31px",
                backgroundColor: isActive ? "#1A1A1A" : "#E5E7EB",
                borderRadius: "50%",
                transition: "background-color 0.2s ease",
              }}
            >
              <span
                className="font-body text-lg leading-[26px]"
                style={{
                  color: isActive ? "#FFFFFF" : "#555555",
                  letterSpacing: "-0.198857px",
                }}
              >
                {step.num}
              </span>
            </div>
            <span
              className="absolute font-body text-lg leading-[26px]"
              style={{
                left: `${labelLeft}px`,
                top: "59px",
                color: isCurrent ? "#1A1A1A" : "#555555",
                fontWeight: isCurrent ? 500 : 400,
                letterSpacing: "-0.198857px",
              }}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
