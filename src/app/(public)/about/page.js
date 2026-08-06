"use client";

import { useState } from "react";
import { CrossBlock, QuadrantBlock } from "@/components/shared/DecorativeBlocks";
import { ArrowRight } from "lucide-react";

const SPONSORS = [
  {
    name: "Alston-Beech Foundation",
    pillColor: "#206C4E",
  },
  {
    name: "Philadelphia Activities Fund",
    pillColor: "#FE7D0C",
  },
  {
    name: "PECO Powering the Arts",
    pillColor: "#F6C847",
  },
];

export default function AboutPage() {
  const [activeTab, setActiveTab] = useState("mission");

  return (
    <div className="relative mx-auto max-w-[1440px] overflow-hidden">
      {/* Decorative background elements */}
      <div
        className="absolute"
        style={{ left: "88px", top: "76px", width: "283px", height: "52px", backgroundColor: "#D7B6B1", transform: "skewX(-8deg)" }}
      />
      <div
        className="absolute"
        style={{ left: "1103px", top: "82px", width: "155px", height: "155px", backgroundColor: "#C7B7FF", transform: "rotate(15deg)", borderRadius: "30px" }}
      />
      <div
        className="absolute"
        style={{ left: "80px", top: "330px", width: "88px", height: "88px", backgroundColor: "#FE6600", clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)" }}
      />
      <div
        className="absolute"
        style={{ left: "538px", top: "340px", width: "64px", height: "64px", backgroundColor: "#F1F58F", clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)" }}
      />
      <div
        className="absolute"
        style={{ left: "1271px", top: "364px", width: "100px", height: "54px", backgroundColor: "#11A858", borderRadius: "27px", transform: "rotate(-10deg)" }}
      />
      <div
        className="absolute"
        style={{ left: "1190px", top: "180px", width: "42px", height: "42px", backgroundColor: "#FF9FC2", transform: "rotate(45deg)", borderRadius: "8px" }}
      />

      {/* About Philly Fest heading */}
      <div className="flex flex-col items-center pt-12 md:pt-[72px]">
        <h1
          className="font-heading text-[28px] font-bold leading-tight md:text-[40px] md:leading-[47px]"
          style={{ letterSpacing: "-0.198857px", color: "#000000" }}
        >
          About Philly Fest
        </h1>
      </div>

      {/* Decorative blocks row */}
      <div className="relative mx-auto mt-[52px] flex w-full max-w-[908px] items-center justify-center gap-[30px] md:gap-[229px]">
        {/* Teal block with cyan accent */}
        <div className="relative shrink-0" style={{ width: 150, height: 150, backgroundColor: "#1E7BF6" }}>
          <div className="absolute" style={{ left: "29.33%", right: "29.33%", top: "37.33%", bottom: "37.33%", backgroundColor: "#50DEF1" }} />
        </div>
        {/* Cross block */}
        <CrossBlock bgColor="#FF93F0" patternColor="#FB439B" size={150} />
        {/* Quadrant block */}
        <QuadrantBlock bgColor="#FF6602" patternColor="#F6C847" size={150} />
      </div>

      {/* Tab bar */}
      <div className="mx-auto mt-[34px] flex w-full max-w-[596px] items-center rounded-[14px] px-[2px] py-[2px]" style={{ backgroundColor: "#ECECF0", height: "36px" }}>
        <button
          onClick={() => setActiveTab("mission")}
          className="flex h-[29px] flex-1 items-center justify-center rounded-[14px] font-body text-sm font-semibold leading-[17px] transition-colors"
          style={{
            backgroundColor: activeTab === "mission" ? "#FFFFFF" : "transparent",
            color: activeTab === "mission" ? "#000000" : "#848484",
          }}
        >
          Our Mission
        </button>
        <button
          onClick={() => setActiveTab("contact")}
          className="flex h-[29px] flex-1 items-center justify-center rounded-[14px] font-body text-sm font-semibold leading-[17px] transition-colors"
          style={{
            backgroundColor: activeTab === "contact" ? "#FFFFFF" : "transparent",
            color: activeTab === "contact" ? "#000000" : "#848484",
          }}
        >
          Contact
        </button>
      </div>

      {activeTab === "mission" ? (
        <>
          {/* Our Mission content */}
          <section className="mx-auto mt-[52px] flex w-full max-w-[915px] flex-col items-center px-4 md:px-0">
            {/* Confetti / streamers decoration */}
            <div className="relative mb-8 h-16 w-full">
              <div className="absolute" style={{ left: "12%", top: "4px", width: "8px", height: "24px", backgroundColor: "#F6C847", transform: "rotate(-20deg)", borderRadius: "4px" }} />
              <div className="absolute" style={{ left: "22%", top: "16px", width: "6px", height: "18px", backgroundColor: "#FE7D0C", transform: "rotate(35deg)", borderRadius: "3px" }} />
              <div className="absolute" style={{ left: "35%", top: "2px", width: "10px", height: "10px", backgroundColor: "#1E7BF6", transform: "rotate(45deg)", borderRadius: "2px" }} />
              <div className="absolute" style={{ left: "48%", top: "8px", width: "7px", height: "20px", backgroundColor: "#FF93F0", transform: "rotate(-15deg)", borderRadius: "3px" }} />
              <div className="absolute" style={{ left: "58%", top: "0px", width: "9px", height: "9px", backgroundColor: "#206C4E", transform: "rotate(25deg)", borderRadius: "2px" }} />
              <div className="absolute" style={{ left: "68%", top: "12px", width: "6px", height: "22px", backgroundColor: "#FB439B", transform: "rotate(-30deg)", borderRadius: "3px" }} />
              <div className="absolute" style={{ left: "78%", top: "4px", width: "8px", height: "8px", backgroundColor: "#F1F58F", transform: "rotate(60deg)", borderRadius: "2px" }} />
              <div className="absolute" style={{ left: "88%", top: "10px", width: "7px", height: "16px", backgroundColor: "#FF6602", transform: "rotate(-10deg)", borderRadius: "3px" }} />
              <div className="absolute" style={{ left: "15%", top: "32px", width: "6px", height: "14px", backgroundColor: "#C7B7FF", transform: "rotate(40deg)", borderRadius: "3px" }} />
              <div className="absolute" style={{ left: "72%", top: "28px", width: "8px", height: "20px", backgroundColor: "#11A858", transform: "rotate(-25deg)", borderRadius: "3px" }} />
            </div>

            <h2 className="font-serif text-center text-[28px] leading-[34px] md:text-[28px]">
              Our mission is simple — to preserve, promote, and
              celebrate the rich festival culture of Philadelphia.
            </h2>
            <p className="mt-3 text-center font-body text-base leading-[19px] text-[#848484]">
              We believe that festivals are the heartbeat of our city.
            </p>

            <div className="mt-[42px] flex flex-col gap-6">
              <p className="max-w-[888px] font-body text-lg leading-[22px] text-[#000000]">
                Philadelphia&apos;s festival culture runs deep — from the vibrant block parties in
                West Philly to the cultural celebrations in Kensington, the food festivals in South
                Philly to the art walks in Center City. These gatherings are more than just events;
                they&apos;re the threads that weave together the diverse communities that make
                Philadelphia the City of Brotherly Love and Sisterly Affection.
              </p>
              <p className="max-w-[888px] font-body text-lg leading-[22px] text-[#000000]">
                Save Philly Festivals was created to document, support, and amplify these community
                celebrations. We work with neighborhood organizers, local businesses, and cultural
                institutions to ensure that Philadelphia&apos;s festival traditions continue to thrive for
                generations to come. By providing resources, promotion, and a centralized platform,
                we help festival organizers reach wider audiences and build stronger communities.
              </p>
            </div>

            {/* Image row with gradient bar */}
            <div className="mt-[52px] flex w-full gap-[26px]">
              <div
                className="shrink-0 rounded-[20px]"
                style={{ width: "19px", height: "456px", background: "linear-gradient(180deg, #C7B7FF 0%, #1E7BF6 50%, #206C4E 100%)" }}
              />
              <div className="relative flex w-full items-center justify-center rounded-[20px] bg-[#D9D9D9]" style={{ height: "456px" }}>
                <span className="font-ui text-sm text-[#848484]">Add Photo</span>
                {/* Play button overlay */}
                <div className="absolute flex size-[72px] items-center justify-center rounded-full bg-white/80 shadow-lg">
                  <svg width="24" height="28" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 2L22 14L2 26V2Z" fill="#1E7BF6" />
                  </svg>
                </div>
              </div>
            </div>
          </section>

          {/* Sponsors section */}
          <section className="mx-auto mt-[104px] flex w-full max-w-[1128px] flex-col items-center px-4 pb-24 md:px-0">
            <h2 className="font-serif text-center text-[28px] leading-[34px]">
              Our Sponsors
            </h2>
            <p className="mt-3 text-center font-body text-base leading-[19px] text-[#848484]">
              We&apos;re grateful for the support of our incredible community partners.
            </p>

            <div className="mt-[52px] flex flex-col gap-6 md:flex-row md:gap-6">
              {SPONSORS.map((sponsor) => (
                <div
                  key={sponsor.name}
                  className="flex w-full flex-col overflow-hidden rounded-[14px]"
                  style={{ width: "336.66px", height: "283.74px", border: "1px solid #D1D1D1" }}
                >
                  <div className="flex h-[178px] items-center justify-center bg-[#D9D9D9]">
                    <span className="font-ui text-sm text-[#848484]">Sponsor Logo</span>
                  </div>
                  <div className="flex flex-1 items-center justify-center px-4">
                    <div
                      className="inline-flex items-center justify-center px-6 py-[9px]"
                      style={{ backgroundColor: sponsor.pillColor, borderRadius: "23px", height: "46px" }}
                    >
                      <span className="font-heading text-[22px] font-medium leading-[26px] text-black">
                        {sponsor.name}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <>
          {/* Contact content */}
          <section className="mx-auto mt-[52px] flex w-full max-w-[840px] flex-col gap-6 px-4 pb-24 md:px-0">
            {/* Contact Us card */}
            <div
              className="flex w-full flex-col gap-8 rounded-[14px] bg-white px-8 py-10 md:px-[52px] md:py-[52px]"
              style={{
                border: "1px solid rgba(0,0,0,0.1)",
                boxShadow: "0px 4px 20px rgba(0,0,0,0.06)",
              }}
            >
              <h2 className="font-serif text-[28px] leading-[34px]">
                Contact Us
              </h2>

              <div className="flex flex-col gap-8 md:flex-row md:gap-[100px]">
                <div className="flex flex-col gap-8">
                  <div className="flex flex-col gap-2">
                    <h3 className="font-heading text-[22px] font-medium leading-[26px]" style={{ color: "#000000" }}>
                      Office Address
                    </h3>
                    <p className="font-body text-base leading-[19px] text-[#848484] max-w-[300px]">
                      1234 Market Street, Suite 200
                      <br />
                      Philadelphia, PA 19107
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <h3 className="font-heading text-[22px] font-medium leading-[26px]" style={{ color: "#000000" }}>
                      Business Hours
                    </h3>
                    <p className="font-ui text-base leading-[19px] text-[#848484]">
                      Monday — Friday: 9:00 AM — 5:00 PM
                      <br />
                      Saturday — Sunday: Closed
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <h3 className="font-heading text-[22px] font-medium leading-[26px]" style={{ color: "#000000" }}>
                      Support
                    </h3>
                    <p className="font-ui text-base leading-[19px] text-[#848484]">
                      info@savephillyfestivals.org
                      <br />
                      (215) 555-0142
                    </p>
                  </div>
                </div>

                {/* Decorative placeholder */}
                <div className="hidden h-[300px] w-full items-center justify-center rounded-[14px] bg-[#F9F8FD] md:flex md:w-[312px]">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="#848484" strokeWidth="1.5" />
                    <path d="M12 6V12L16 14" stroke="#848484" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Contact form */}
            <div
              className="flex w-full flex-col rounded-[14px] bg-white px-8 py-10 md:px-[52px] md:py-[52px]"
              style={{
                border: "1px solid rgba(0,0,0,0.1)",
                boxShadow: "0px 4px 20px rgba(0,0,0,0.06)",
              }}
            >
              <div className="flex flex-col gap-[31px]">
                <div className="flex w-full flex-col gap-5 md:flex-row md:gap-8">
                  <div className="flex w-full flex-col gap-2">
                    <label className="font-heading text-[22px] font-medium leading-[26px]">
                      Your Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      className="w-full border-b pb-2 font-body text-base leading-[19px] text-[#848484] outline-none"
                      style={{ borderBottomColor: "#848484" }}
                    />
                  </div>
                  <div className="flex w-full flex-col gap-2">
                    <label className="font-heading text-[22px] font-medium leading-[26px]">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="Enter your email address"
                      className="w-full border-b pb-2 font-body text-base leading-[19px] text-[#848484] outline-none"
                      style={{ borderBottomColor: "#848484" }}
                    />
                  </div>
                </div>

                <div className="flex w-full flex-col gap-2">
                  <label className="font-heading text-[22px] font-medium leading-[26px]">
                    Message
                  </label>
                  <textarea
                    placeholder="Write your message here..."
                    className="w-full resize-none border-b pb-2 font-body text-base leading-[19px] text-[#848484] outline-none"
                    style={{ borderBottomColor: "#848484", minHeight: "146px" }}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    className="flex items-center justify-center gap-3 rounded-[37px] font-body text-xl font-bold leading-[24px] text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: "#1E7BF6", width: "332px", height: "75px" }}
                  >
                    Send Message
                    <ArrowRight className="size-6" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
