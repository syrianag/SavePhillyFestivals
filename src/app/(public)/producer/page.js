"use client";

import { CrossBlock, QuadrantBlock } from "@/components/shared/DecorativeBlocks";
import { Calendar, Clock, MapPin, ChevronDown } from "lucide-react";
import { categories } from "@/lib/festivals";
import { OnboardingProvider, useOnboarding } from "@/features/onboarding/onboarding-context";
import { OnboardingQuestionnaire } from "@/features/onboarding/OnboardingQuestionnaire";
import { SectionHeading } from "@/components/home/SectionHeading";
import { Reveal } from "@/components/home/Reveal";
import { Button } from "@/components/ui/button";

const STEPS = [
  { num: 1, label: "Basic Info", active: true },
  { num: 2, label: "Details", active: false },
  { num: 3, label: "Story", active: false },
  { num: 4, label: "Review", active: false },
];

const TIPS = [
  {
    bgColor: "#FF8577",
    title: "Plan ahead",
    description:
      "Submit at least 4 weeks before your event for better visibility and planning.",
  },
  {
    bgColor: "#206C4E",
    title: "Be detailed",
    description:
      "Clear descriptions help attendees understand what to expect and why they should come.",
  },
  {
    bgColor: "#1E7BF6",
    title: "Know your audience",
    description:
      "Share details that help people decide if your festival is right for them.",
  },
];

const RESOURCES = [
  {
    title: "Step-by-step guide to organize your event",
    size: "PDF · 0.8 MB",
    pill: "Philly Festivals Toolkit",
    pillColor: "#F6C847",
  },
  {
    title: "Slides from the Philly Festivals Mixer event from March 2025.",
    size: "PDF · 1.3 MB",
    pill: "Mixer Slides",
    pillColor: "#FF8577",
  },
];

function ProducerPageContent() {
  const { complete, retake } = useOnboarding();

  return (
    <div className="relative overflow-hidden">
      <div className="absolute -left-16 top-32 h-52 w-52 rounded-full bg-primary opacity-10 blur-3xl" />
      <div className="absolute -right-16 top-1/3 h-56 w-56 rounded-full bg-brand-yellow opacity-20 blur-3xl" />
      <div className="absolute bottom-32 left-1/4 h-52 w-52 rounded-full bg-accent opacity-10 blur-3xl" />

      <div className="relative mx-auto max-w-[1440px] px-4 md:px-[81px]">
        {/* Hero */}
        <section className="grid grid-cols-1 items-stretch gap-6 py-12 md:grid-cols-2 md:py-16">
          <Reveal className="h-full">
            <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-border bg-muted md:h-full">
              <span className="font-ui text-sm text-muted-foreground">Add Photo</span>
            </div>
          </Reveal>

          <Reveal delay={100} className="h-full">
            <div
              className="relative flex h-64 flex-col justify-end overflow-hidden rounded-2xl md:h-full"
              style={{ backgroundColor: "#1E7BF6" }}
            >
              <div className="absolute -right-16 -top-16 size-48 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute bottom-24 left-24 size-24 opacity-40">
                <CrossBlock bgColor="#206C4E" patternColor="#FF8577" />
              </div>
              <div className="absolute -left-10 bottom-4 size-24 opacity-40">
                <QuadrantBlock bgColor="#FE7D0C" patternColor="#F6C847" />
              </div>

              <div className="relative flex flex-col gap-4 p-6 md:p-10">
                <span className="mb-1 inline-block w-fit rounded-full bg-white/20 px-4 py-1.5 font-ui text-sm font-semibold text-white">
                  For Producers
                </span>
                <h1 className="font-heading text-3xl font-bold leading-tight text-white md:text-[40px] md:leading-[47px]">
                  Showcase your event on Philly Festivals
                </h1>
                <p className="max-w-[565px] font-body text-base leading-[22px] text-white/90 md:text-lg">
                  Join our vibrant community of festival organizers. Submit your event and connect with
                  thousands of festival-goers across Philadelphia.
                </p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Main content */}
        <section className="flex flex-col gap-10 py-10 md:flex-row md:gap-[42px] md:py-[72px]">
          {!complete ? (
            <Reveal className="w-full">
              <OnboardingQuestionnaire />
            </Reveal>
          ) : (
            <>
              <Reveal className="w-full">
                <div className="w-full rounded-2xl border border-border bg-card shadow-sm md:w-[822.8px]">
                  <div className="px-8 pb-8 pt-10 md:px-10 md:pb-[18px] md:pt-[50px]">
                    <div className="relative mx-auto mb-10 h-[86.45px] w-[640.73px]">
                      {STEPS.map((step, i) => {
                        const circleLeft = [69.98, 253.32, 447.32, 636.03][i];
                        const labelLeft = [50.03, 243.08, 440.69, 626.69][i];
                        return (
                          <div key={step.num}>
                            {i < 3 && (
                              <div
                                className="absolute top-[19px] h-[5px]"
                                style={{
                                  left: `${circleLeft + 52.88}px`,
                                  width: "111px",
                                  backgroundColor: "var(--color-border)",
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
                                backgroundColor: step.active
                                  ? "var(--color-foreground)"
                                  : "var(--color-border)",
                                borderRadius: "50%",
                              }}
                            >
                              <span
                                className="font-body text-lg leading-[26px]"
                                style={{
                                  color: step.active
                                    ? "var(--color-background)"
                                    : "var(--color-muted-foreground)",
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
                                color: step.active
                                  ? "var(--color-foreground)"
                                  : "var(--color-muted-foreground)",
                                fontWeight: step.active ? 500 : 400,
                              }}
                            >
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex w-full flex-col gap-[31.73px]">
                      <div className="flex w-full flex-col gap-[10.58px]">
                        <label className="font-body text-lg font-semibold leading-[19px] text-foreground">
                          Festival Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., Summer Music Festival"
                          className="w-full rounded-xl bg-muted px-4 py-3 font-body text-lg leading-[22px] text-foreground placeholder:text-muted-foreground focus:border focus:border-primary focus:outline-none"
                        />
                      </div>

                      <div className="flex flex-col gap-5 md:flex-row md:gap-5">
                        <div className="flex w-full flex-col gap-[10px] md:w-[360px]">
                          <label className="font-body text-lg font-semibold leading-[19px] text-foreground">
                            Start Date
                          </label>
                          <div className="relative w-full">
                            <input
                              type="date"
                              className="w-full rounded-xl bg-muted px-3 py-3 font-body text-lg leading-[22px] text-foreground focus:border focus:border-primary focus:outline-none"
                            />
                            <Calendar className="pointer-events-none absolute right-3 top-1/2 size-6 -translate-y-1/2 text-foreground" />
                          </div>
                        </div>
                        <div className="flex w-full flex-col gap-[10px] md:w-[360px]">
                          <label className="font-body text-lg font-semibold leading-[19px] text-foreground">
                            End Date
                          </label>
                          <div className="relative w-full">
                            <input
                              type="date"
                              className="w-full rounded-xl bg-muted px-3 py-3 font-body text-lg leading-[22px] text-foreground focus:border focus:border-primary focus:outline-none"
                            />
                            <Calendar className="pointer-events-none absolute right-3 top-1/2 size-6 -translate-y-1/2 text-foreground" />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-5 md:flex-row md:gap-5">
                        <div className="flex w-full flex-col gap-[10px] md:w-[360px]">
                          <label className="font-body text-lg font-semibold leading-[19px] text-foreground">
                            Start Time
                          </label>
                          <div className="relative w-full">
                            <input
                              type="time"
                              className="w-full rounded-xl bg-muted px-3 py-3 font-body text-lg leading-[22px] text-foreground focus:border focus:border-primary focus:outline-none"
                            />
                            <Clock className="pointer-events-none absolute right-3 top-1/2 size-6 -translate-y-1/2 text-foreground" />
                          </div>
                        </div>
                        <div className="flex w-full flex-col gap-[10px] md:w-[360px]">
                          <label className="font-body text-lg font-semibold leading-[19px] text-foreground">
                            End Time
                          </label>
                          <div className="relative w-full">
                            <input
                              type="time"
                              className="w-full rounded-xl bg-muted px-3 py-3 font-body text-lg leading-[22px] text-foreground focus:border focus:border-primary focus:outline-none"
                            />
                            <Clock className="pointer-events-none absolute right-3 top-1/2 size-6 -translate-y-1/2 text-foreground" />
                          </div>
                        </div>
                      </div>

                      <div className="flex w-full flex-col gap-[10.58px]">
                        <label className="font-body text-lg font-semibold leading-[19px] text-foreground">
                          Where does your festival take place?
                        </label>
                        <div className="relative w-full">
                          <input
                            type="text"
                            placeholder="Venue name or address in Philadelphia"
                            className="w-full rounded-xl bg-muted px-4 py-3 font-body text-lg leading-[22px] text-foreground placeholder:text-muted-foreground focus:border focus:border-primary focus:outline-none"
                          />
                          <MapPin className="pointer-events-none absolute right-4 top-1/2 size-[25px] -translate-y-1/2 text-foreground" />
                        </div>
                      </div>

                      <div className="flex w-full flex-col gap-[10.58px]">
                        <label className="font-body text-lg font-semibold leading-[19px] text-foreground">
                          Festival Category
                        </label>
                        <div className="relative w-full">
                          <select
                            className="w-full appearance-none rounded-xl border border-border bg-card px-4 py-3 font-body text-lg leading-[22px] text-foreground focus:border-primary focus:outline-none"
                            defaultValue=""
                          >
                            <option value="" disabled>Select a category</option>
                            {categories.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-6 -translate-y-1/2 text-foreground" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-[31.73px] flex items-center justify-between border-t pt-6">
                      <button
                        onClick={retake}
                        className="font-body text-base font-semibold text-primary underline-offset-4 hover:underline"
                      >
                        Retake Questionnaire
                      </button>
                      <Button className="bg-black hover:bg-black/80">
                        Continue
                      </Button>
                    </div>
                  </div>
                </div>
              </Reveal>

              <div className="flex w-full flex-col gap-[42px] md:w-[417px]">
                <Reveal delay={80} className="h-full">
                  <div className="flex w-full flex-col rounded-2xl border border-border bg-card p-6 shadow-sm md:p-[33px]">
                    <h3 className="font-heading text-[22px] font-semibold leading-[32px] text-foreground">
                      Submission Tips
                    </h3>
                    <div className="mt-6 flex flex-col gap-6">
                      {TIPS.map((tip) => (
                        <div key={tip.title} className="flex gap-[15.87px]">
                          <div
                            className="flex size-[42.31px] shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor: tip.bgColor }}
                          >
                            <svg width="21.16" height="21.16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <rect x="8" y="2" width="8" height="20" rx="2" stroke="white" strokeWidth="1.76" />
                            </svg>
                          </div>
                          <div className="flex flex-col gap-[5.29px]">
                            <span className="font-body text-lg font-semibold leading-[26px] text-foreground">
                              {tip.title}
                            </span>
                            <span className="font-body text-lg leading-[26px] text-muted-foreground">
                              {tip.description}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Reveal>

                <Reveal delay={160} className="h-full">
                  <div className="flex h-[346px] w-full items-center justify-center rounded-2xl border border-border bg-muted">
                    <span className="font-ui text-sm text-muted-foreground">Add Photo</span>
                  </div>
                </Reveal>
              </div>
            </>
          )}
        </section>

        {/* Resources */}
        <section className="bg-background pb-16 md:pb-24">
          <Reveal>
            <SectionHeading
              eyebrow="Resources"
              title="Resources"
              description="Tools and guides to help you plan, promote, and run a successful festival."
            />
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-6 md:mt-14 md:grid-cols-2">
            {RESOURCES.map((resource, i) => (
              <Reveal key={resource.title} delay={i * 80} className="h-full">
                <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-lg">
                  <div className="flex h-52 items-center justify-center bg-muted">
                    <span className="font-ui text-sm text-muted-foreground">Add Photo</span>
                  </div>
                  <div className="flex flex-1 flex-col px-6 pb-6 pt-5">
                    <p className="max-w-[260px] font-body text-lg leading-[20px] text-foreground">
                      {resource.title}
                    </p>
                    <div className="mt-6 flex items-center gap-5">
                      <button className="flex items-center gap-2">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <rect x="12" y="3" width="12" height="15" rx="2" stroke="var(--color-primary)" strokeWidth="1.33" />
                          <rect x="3" y="15" width="18" height="6" rx="2" stroke="var(--color-primary)" strokeWidth="1.33" />
                          <line x1="7" y1="10" x2="7" y2="15" stroke="var(--color-primary)" strokeWidth="1.33" />
                          <line x1="17" y1="10" x2="17" y2="15" stroke="var(--color-primary)" strokeWidth="1.33" />
                        </svg>
                        <span className="font-body text-base font-semibold leading-[20px] text-primary">
                          Download
                        </span>
                      </button>
                      <span className="font-body text-xs leading-[16px] text-muted-foreground">
                        {resource.size}
                      </span>
                    </div>
                    <div
                      className="mt-5 inline-flex w-fit items-center justify-center px-6 py-2"
                      style={{ backgroundColor: resource.pillColor, borderRadius: "18.8718px" }}
                    >
                      <span className="font-serif text-xl leading-[25px] text-black">
                        {resource.pill}
                      </span>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function ProducerPage() {
  return (
    <OnboardingProvider>
      <ProducerPageContent />
    </OnboardingProvider>
  );
}
