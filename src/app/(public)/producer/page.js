import Link from "next/link";
import { CrossBlock, QuadrantBlock } from "@/components/shared/DecorativeBlocks";
import { Calendar, Clock, MapPin, ChevronDown } from "lucide-react";
import { categories } from "@/lib/festivals";

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

export default function ProducerPage() {
  return (
    <div className="mx-auto max-w-[1440px]">
      <section className="flex h-[464px] flex-col md:flex-row">
        <div className="flex h-[232px] w-full items-center justify-center bg-[#D9D9D9] md:h-full md:w-[700px]">
          <span className="font-ui text-sm text-[#848484]">Add Photo</span>
        </div>
        <div className="relative flex h-[232px] flex-1 md:h-full" style={{ backgroundColor: "#1E7BF6" }}>
          <div
            className="absolute"
            style={{ left: "0%", right: "68.48%", top: "0%", bottom: "51.81%", backgroundColor: "#FE7D0C" }}
          />
          <div className="absolute" style={{ left: "233px", top: "0px" }}>
            <CrossBlock bgColor="#206C4E" patternColor="#FF8577" />
          </div>
          <div className="absolute" style={{ left: "465px", top: "0px" }}>
            <QuadrantBlock bgColor="#FE7D0C" patternColor="#F6C847" />
          </div>
          <div
            className="absolute flex flex-col gap-4 px-4 md:px-0"
            style={{ left: "40px", top: "267px" }}
          >
            <h1
              className="font-heading text-[28px] font-bold leading-tight md:text-[40px] md:leading-[47px]"
              style={{ color: "#F6C847" }}
            >
              Showcase your event on Philly Festivals
            </h1>
            <p
              className="max-w-[565px] font-body text-base leading-[22px] text-white md:text-lg"
            >
              Join our vibrant community of festival organizers. Submit your event and connect with
              thousands of festival-goers across Philadelphia.
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-10 px-4 py-[90px] md:flex-row md:px-[79px] md:gap-[42px]">
        <div
          className="w-full bg-white md:w-[822.8px]"
          style={{ border: "1px solid #E2E8F0", borderRadius: "22px" }}
        >
          <div className="px-10 pb-[18px] pt-[50px]">
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
                          backgroundColor: "#E2E8F0",
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
                        backgroundColor: step.active ? "#000000" : "#E2E8F0",
                        borderRadius: "50%",
                      }}
                    >
                      <span
                        className="font-body text-lg leading-[26px]"
                        style={{
                          color: step.active ? "#FFFFFF" : "#62748E",
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
                        color: step.active ? "#0F172B" : "#62748E",
                        fontWeight: step.active ? 500 : 400,
                        letterSpacing: "-0.198857px",
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
                <label className="font-body text-lg font-semibold leading-[19px] text-[#0A0A0A]" style={{ letterSpacing: "-0.198857px" }}>
                  Festival Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Summer Music Festival"
                  className="w-full rounded-[13.22px] bg-[#F9F8FD] px-4 py-3 font-body text-lg leading-[22px] text-[#717182] placeholder:text-[#717182] focus:outline-none"
                  style={{ letterSpacing: "-0.198857px" }}
                />
              </div>

              <div className="flex flex-col gap-5 md:flex-row md:gap-5">
                <div className="flex w-full flex-col gap-[10px] md:w-[360px]">
                  <label className="font-body text-lg font-semibold leading-[19px] text-[#0A0A0A]" style={{ letterSpacing: "-0.198857px" }}>
                    Start Date
                  </label>
                  <div className="relative w-full">
                    <input
                      type="date"
                      className="w-full rounded-[14px] bg-[#F9F8FD] px-3 py-3 font-body text-lg leading-[22px] text-[#212121] focus:outline-none"
                      style={{ letterSpacing: "-0.198857px" }}
                    />
                    <Calendar className="pointer-events-none absolute right-3 top-1/2 size-6 -translate-y-1/2 text-black" />
                  </div>
                </div>
                <div className="flex w-full flex-col gap-[10px] md:w-[360px]">
                  <label className="font-body text-lg font-semibold leading-[19px] text-[#0A0A0A]" style={{ letterSpacing: "-0.198857px" }}>
                    End Date
                  </label>
                  <div className="relative w-full">
                    <input
                      type="date"
                      className="w-full rounded-[14px] bg-[#F9F8FD] px-3 py-3 font-body text-lg leading-[22px] text-[#212121] focus:outline-none"
                      style={{ letterSpacing: "-0.198857px" }}
                    />
                    <Calendar className="pointer-events-none absolute right-3 top-1/2 size-6 -translate-y-1/2 text-black" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-5 md:flex-row md:gap-5">
                <div className="flex w-full flex-col gap-[10px] md:w-[360px]">
                  <label className="font-body text-lg font-semibold leading-[19px] text-[#0A0A0A]" style={{ letterSpacing: "-0.198857px" }}>
                    Start Time
                  </label>
                  <div className="relative w-full">
                    <input
                      type="time"
                      className="w-full rounded-[14px] bg-[#F9F8FD] px-3 py-3 font-body text-lg leading-[22px] text-[#212121] focus:outline-none"
                      style={{ letterSpacing: "-0.198857px" }}
                    />
                    <Clock className="pointer-events-none absolute right-3 top-1/2 size-6 -translate-y-1/2" style={{ color: "#1E1E1E" }} />
                  </div>
                </div>
                <div className="flex w-full flex-col gap-[10px] md:w-[360px]">
                  <label className="font-body text-lg font-semibold leading-[19px] text-[#0A0A0A]" style={{ letterSpacing: "-0.198857px" }}>
                    End Time
                  </label>
                  <div className="relative w-full">
                    <input
                      type="time"
                      className="w-full rounded-[14px] bg-[#F9F8FD] px-3 py-3 font-body text-lg leading-[22px] text-[#212121] focus:outline-none"
                      style={{ letterSpacing: "-0.198857px" }}
                    />
                    <Clock className="pointer-events-none absolute right-3 top-1/2 size-6 -translate-y-1/2" style={{ color: "#1E1E1E" }} />
                  </div>
                </div>
              </div>

              <div className="flex w-full flex-col gap-[10.58px]">
                <label className="font-body text-lg font-semibold leading-[19px] text-[#0A0A0A]" style={{ letterSpacing: "-0.198857px" }}>
                  Where does your festival take place?
                </label>
                <div className="relative w-full">
                  <input
                    type="text"
                    placeholder="Venue name or address in Philadelphia"
                    className="w-full rounded-[13.22px] bg-[#F9F8FD] px-4 py-3 font-body text-lg leading-[22px] text-[#717182] placeholder:text-[#717182] focus:outline-none"
                    style={{ letterSpacing: "-0.198857px" }}
                  />
                  <MapPin className="pointer-events-none absolute right-4 top-1/2 size-[25px] -translate-y-1/2" style={{ color: "#1E1E1E" }} />
                </div>
              </div>

              <div className="flex w-full flex-col gap-[10.58px]">
                <label className="font-body text-lg font-semibold leading-[19px] text-[#0A0A0A]" style={{ letterSpacing: "-0.198857px" }}>
                  Festival Category
                </label>
                <div className="relative w-full">
                  <select
                    className="w-full appearance-none rounded-[13.22px] border bg-white px-4 py-3 font-body text-lg leading-[22px] text-[#212121] focus:outline-none"
                    style={{ borderColor: "#CAD5E2", letterSpacing: "-0.198857px" }}
                    defaultValue=""
                  >
                    <option value="" disabled>Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-6 -translate-y-1/2" style={{ color: "#1D1B20" }} />
                </div>
              </div>
            </div>

            <div className="mt-[31.73px] flex items-center justify-between border-t pt-6" style={{ borderTopColor: "#E2E8F0" }}>
              <div />
              <button
                className="flex h-[47px] w-[142px] items-center justify-center rounded-[12px] bg-black font-body text-base font-bold leading-[19px] text-white"
                style={{ textAlign: "center" }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-[42px] md:w-[417px]">
          <div
            className="flex w-full flex-col bg-white"
            style={{ border: "1px solid #E2E8F0", borderRadius: "21.1563px", padding: "33.0567px" }}
          >
            <h3
              className="font-heading text-[22px] font-semibold leading-[32px]"
              style={{ color: "#0F172B", letterSpacing: "-0.413209px" }}
            >
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
                    <span
                      className="font-body text-lg font-semibold leading-[26px]"
                      style={{ color: "#0F172B", letterSpacing: "-0.198857px" }}
                    >
                      {tip.title}
                    </span>
                    <span
                      className="font-body text-lg leading-[26px]"
                      style={{ color: "#45556C", letterSpacing: "-0.198857px" }}
                    >
                      {tip.description}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex h-[346px] w-full items-center justify-center rounded-[15px] bg-[#F1EFEB]">
            <span className="font-ui text-sm text-[#848484]">Add Photo</span>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 md:px-[79px] md:pb-24">
        <h2
          className="font-body text-2xl font-semibold leading-[32px] md:text-[36px]"
          style={{ letterSpacing: "-0.413209px", color: "#000000" }}
        >
          Resources
        </h2>

        <div className="mt-10 flex flex-col gap-6 md:flex-row md:gap-6">
          <div
            className="flex w-full flex-col overflow-hidden md:w-[313px]"
            style={{ border: "1px solid #D1D1D1", borderRadius: "16px", backgroundColor: "rgba(255,255,255,0.85)" }}
          >
            <div className="flex h-[249px] items-center justify-center bg-[#D9D9D9]">
              <span className="font-ui text-sm text-[#848484]">Add Photo</span>
            </div>
            <div className="flex flex-1 flex-col bg-white px-5 pb-5 pt-4">
              <p className="max-w-[252px] font-body text-lg leading-[20px] text-black" style={{ letterSpacing: "-0.150391px" }}>
                Step-by-step guide to organize your event
              </p>
              <div className="mt-8 flex items-center gap-5">
                <button className="flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="12" y="3" width="12" height="15" rx="2" stroke="#1E7BF6" strokeWidth="1.33" />
                    <rect x="3" y="15" width="18" height="6" rx="2" stroke="#1E7BF6" strokeWidth="1.33" />
                    <line x1="7" y1="10" x2="7" y2="15" stroke="#1E7BF6" strokeWidth="1.33" />
                    <line x1="17" y1="10" x2="17" y2="15" stroke="#1E7BF6" strokeWidth="1.33" />
                  </svg>
                  <span className="font-body text-base font-semibold leading-[20px] text-[#1E7BF6]" style={{ letterSpacing: "-0.150391px" }}>
                    Download
                  </span>
                </button>
                <span className="font-body text-xs leading-[16px] text-[#62748E]">PDF · 0.8 MB</span>
              </div>
              <div
                className="mt-5 inline-flex w-fit items-center justify-center px-[23px] py-[7px]"
                style={{ backgroundColor: "#F6C847", borderRadius: "18.8718px" }}
              >
                <span className="font-serif text-xl leading-[25px] text-black">Philly Festivals Toolkit</span>
              </div>
            </div>
          </div>

          <div
            className="flex w-full flex-col overflow-hidden md:w-[313px]"
            style={{ border: "1px solid #D1D1D1", borderRadius: "16px", backgroundColor: "rgba(255,255,255,0.85)" }}
          >
            <div className="flex h-[249px] items-center justify-center bg-[#D9D9D9]">
              <span className="font-ui text-sm text-[#848484]">Add Photo</span>
            </div>
            <div className="flex flex-1 flex-col bg-white px-5 pb-5 pt-4">
              <p className="max-w-[260px] font-body text-lg leading-[20px] text-black" style={{ letterSpacing: "-0.150391px" }}>
                Slides from the Philly Festivals Mixer event from March 2025.
              </p>
              <div className="mt-8 flex items-center gap-5">
                <button className="flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="12" y="3" width="12" height="15" rx="2" stroke="#1E7BF6" strokeWidth="1.33" />
                    <rect x="3" y="15" width="18" height="6" rx="2" stroke="#1E7BF6" strokeWidth="1.33" />
                    <line x1="7" y1="10" x2="7" y2="15" stroke="#1E7BF6" strokeWidth="1.33" />
                    <line x1="17" y1="10" x2="17" y2="15" stroke="#1E7BF6" strokeWidth="1.33" />
                  </svg>
                  <span className="font-body text-base font-semibold leading-[20px] text-[#1E7BF6]" style={{ letterSpacing: "-0.150391px" }}>
                    Download
                  </span>
                </button>
                <span className="font-body text-xs leading-[16px] text-[#62748E]">PDF · 1.3 MB</span>
              </div>
              <div
                className="mt-5 inline-flex w-fit items-center justify-center px-[23px] py-[7px]"
                style={{ backgroundColor: "#FF8577", borderRadius: "18.8718px" }}
              >
                <span className="font-serif text-xl leading-[25px] text-black">Mixer Slides</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
