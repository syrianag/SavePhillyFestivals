"use client";

import { useState } from "react";
import { CrossBlock, QuadrantBlock } from "@/components/shared/DecorativeBlocks";
import { ArrowRight, MapPin, Mail, Phone, Clock } from "lucide-react";

const SPONSORS = [
  {
    name: "Alston-Beech Foundation",
    pillColor: "#e0f2fe",
    textColor: "#0369a1",
  },
  {
    name: "Philadelphia Activities Fund",
    pillColor: "#ffedd5",
    textColor: "#c2410c",
  },
  {
    name: "PECO Powering the Arts",
    pillColor: "#fef9c3",
    textColor: "#a16207",
  },
];

export default function AboutPage() {
  const [activeTab, setActiveTab] = useState("mission");

  return (
    <div className="relative mx-auto max-w-[1440px] overflow-hidden px-4 md:px-[81px] py-10 md:py-16">
      {/* Decorative background elements with low opacity and blur */}
      <div className="absolute top-10 left-10 size-64 rounded-full bg-indigo-100/30 blur-3xl pointer-events-none" />
      <div className="absolute top-40 right-10 size-80 rounded-full bg-pink-100/20 blur-3xl pointer-events-none" />

      {/* About Philly Fest heading */}
      <div className="flex flex-col items-center mb-10">
        <h1
          className="font-heading text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 text-center"
        >
          About Philly Fest
        </h1>
        <div className="mt-3 h-1 w-20 rounded-full bg-indigo-600" />
      </div>

      {/* Decorative blocks row */}
      <div className="relative mx-auto flex w-full max-w-[700px] items-center justify-center gap-6 sm:gap-12 md:gap-16 mb-12">
        <div className="relative shrink-0 rounded-2xl overflow-hidden shadow-md" style={{ width: 100, height: 100, backgroundColor: "#1E7BF6" }}>
          <div className="absolute inset-4 rounded-lg bg-[#50DEF1]/30 animate-pulse" />
        </div>
        <CrossBlock bgColor="#FF93F0" patternColor="#FB439B" size={100} />
        <QuadrantBlock bgColor="#FF6602" patternColor="#F6C847" size={100} />
      </div>

      {/* Tab bar */}
      <div className="mx-auto flex max-w-[400px] items-center rounded-full p-1 bg-slate-100 border border-slate-200/50 mb-12">
        <button
          onClick={() => setActiveTab("mission")}
          className="flex h-9 flex-1 items-center justify-center rounded-full font-ui text-sm font-bold transition-all shadow-3xs cursor-pointer"
          style={{
            backgroundColor: activeTab === "mission" ? "#FFFFFF" : "transparent",
            color: activeTab === "mission" ? "#4f46e5" : "#64748b",
          }}
        >
          Our Mission
        </button>
        <button
          onClick={() => setActiveTab("contact")}
          className="flex h-9 flex-1 items-center justify-center rounded-full font-ui text-sm font-bold transition-all shadow-3xs cursor-pointer"
          style={{
            backgroundColor: activeTab === "contact" ? "#FFFFFF" : "transparent",
            color: activeTab === "contact" ? "#4f46e5" : "#64748b",
          }}
        >
          Contact
        </button>
      </div>

      {activeTab === "mission" ? (
        <>
          {/* Our Mission content */}
          <section className="mx-auto flex w-full max-w-[960px] flex-col items-center">
            {/* Confetti decoration */}
            <div className="relative mb-6 h-12 w-full max-w-[600px] opacity-80">
              <div className="absolute left-[10%] top-2 w-2 h-6 bg-yellow-400 rotate-12 rounded-full" />
              <div className="absolute left-[30%] top-4 w-3 h-3 bg-blue-500 rotate-45 rounded-xs" />
              <div className="absolute left-[50%] top-1 w-2.5 h-7 bg-pink-500 -rotate-12 rounded-full" />
              <div className="absolute left-[70%] top-3 w-3 h-3 bg-green-500 rotate-12 rounded-xs" />
              <div className="absolute left-[90%] top-2 w-2 h-5 bg-indigo-500 -rotate-45 rounded-full" />
            </div>

            <h2 className="font-serif text-center text-2xl sm:text-3xl leading-snug text-slate-800 font-semibold max-w-3xl">
              Our mission is simple — to preserve, promote, and celebrate the rich festival culture of Philadelphia.
            </h2>
            <p className="mt-4 text-center font-body text-base text-slate-500">
              We believe that festivals are the heartbeat of our city.
            </p>

            <div className="mt-10 flex flex-col gap-6 text-slate-650 max-w-3xl">
              <p className="font-body text-base leading-relaxed">
                Philadelphia&apos;s festival culture runs deep — from the vibrant block parties in West Philly to the cultural celebrations in Kensington, the food festivals in South Philly to the art walks in Center City. These gatherings are more than just events; they&apos;re the threads that weave together the diverse communities that make Philadelphia the City of Brotherly Love and Sisterly Affection.
              </p>
              <p className="font-body text-base leading-relaxed">
                Save Philly Festivals was created to document, support, and amplify these community celebrations. We work with neighborhood organizers, local businesses, and cultural institutions to ensure that Philadelphia&apos;s festival traditions continue to thrive for generations to come. By providing resources, promotion, and a centralized platform, we help festival organizers reach wider audiences and build stronger communities.
              </p>
            </div>

            {/* Video overlay placeholder */}
            <div className="mt-14 flex w-full max-w-3xl gap-5 items-stretch">
              <div
                className="shrink-0 w-2.5 rounded-full"
                style={{ background: "linear-gradient(180deg, #C7B7FF 0%, #1E7BF6 50%, #206C4E 100%)" }}
              />
              <div 
                className="relative flex-1 flex items-center justify-center rounded-2xl bg-cover bg-center shadow-md overflow-hidden group cursor-pointer border border-slate-200"
                style={{ 
                  height: "380px",
                  backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.4), rgba(15, 23, 42, 0.4)), url("https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=800")'
                }}
              >
                {/* Play button overlay */}
                <div className="absolute flex size-18 items-center justify-center rounded-full bg-white/95 shadow-lg group-hover:scale-105 transition-transform duration-300">
                  <svg width="20" height="24" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="ml-1">
                    <path d="M2 2L22 14L2 26V2Z" fill="#4f46e5" />
                  </svg>
                </div>
              </div>
            </div>
          </section>

          {/* Sponsors section */}
          <section className="mx-auto mt-20 flex w-full max-w-[1000px] flex-col items-center pb-16">
            <h2 className="font-serif text-center text-3xl font-bold text-slate-900">
              Our Sponsors
            </h2>
            <p className="mt-3 text-center font-body text-base text-slate-500">
              We&apos;re grateful for the support of our incredible community partners.
            </p>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
              {SPONSORS.map((sponsor) => (
                <div
                  key={sponsor.name}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs hover:shadow-xs transition-all duration-300"
                >
                  <div className="flex h-[150px] items-center justify-center bg-slate-50 border-b border-slate-100 p-6">
                    <div className="size-16 rounded-xl bg-white shadow-3xs flex items-center justify-center border border-slate-100 group-hover:scale-103 transition-transform duration-300">
                      <span className="font-heading text-lg font-bold text-slate-400">Logo</span>
                    </div>
                  </div>
                  <div className="flex flex-1 items-center justify-center p-6 bg-white">
                    <div
                      className="inline-flex items-center justify-center px-6 rounded-full border border-slate-100 shadow-3xs"
                      style={{ backgroundColor: sponsor.pillColor, height: "40px" }}
                    >
                      <span className="font-heading text-sm font-bold" style={{ color: sponsor.textColor }}>
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
          <section className="mx-auto mt-6 flex w-full max-w-[800px] flex-col gap-8 pb-16">
            {/* Contact Us card */}
            <div
              className="flex w-full flex-col gap-8 rounded-2xl bg-white p-6 sm:p-10 border border-slate-200 shadow-sm"
            >
              <h2 className="font-serif text-3xl font-bold text-slate-950">
                Contact Us
              </h2>

              <div className="flex flex-col gap-8 md:flex-row md:justify-between">
                <div className="flex flex-col gap-6.5">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-650 shrink-0 border border-indigo-100">
                      <MapPin className="size-5" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <h3 className="font-heading text-base font-bold text-slate-900">
                        Office Address
                      </h3>
                      <p className="font-body text-sm text-slate-500">
                        1234 Market Street, Suite 200
                        <br />
                        Philadelphia, PA 19107
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-650 shrink-0 border border-indigo-100">
                      <Clock className="size-5" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <h3 className="font-heading text-base font-bold text-slate-900">
                        Business Hours
                      </h3>
                      <p className="font-body text-sm text-slate-500">
                        Monday — Friday: 9:00 AM — 5:00 PM
                        <br />
                        Saturday — Sunday: Closed
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-650 shrink-0 border border-indigo-100">
                      <Mail className="size-5" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <h3 className="font-heading text-base font-bold text-slate-900">
                        Support
                      </h3>
                      <p className="font-body text-sm text-slate-500">
                        info@savephillyfestivals.org
                        <br />
                        (215) 555-0142
                      </p>
                    </div>
                  </div>
                </div>

                {/* Clock icon map graphic placeholder */}
                <div className="hidden h-[260px] items-center justify-center rounded-xl bg-slate-50 border border-slate-100 md:flex md:w-[280px]">
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="#94a3b8" strokeWidth="1.5" />
                    <path d="M12 6V12L16 14" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Contact form */}
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex w-full flex-col gap-6 rounded-2xl bg-white p-6 sm:p-10 border border-slate-200 shadow-sm"
            >
              <div className="flex flex-col gap-6">
                <div className="flex w-full flex-col gap-6 sm:flex-row">
                  <div className="flex w-full flex-col gap-2">
                    <label className="font-ui text-sm font-bold text-slate-700">
                      Your Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      className="w-full h-10 px-4 rounded-lg border border-slate-200 bg-slate-50/50 font-body text-sm text-slate-900 outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div className="flex w-full flex-col gap-2">
                    <label className="font-ui text-sm font-bold text-slate-700">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="Enter your email address"
                      className="w-full h-10 px-4 rounded-lg border border-slate-200 bg-slate-50/50 font-body text-sm text-slate-900 outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div className="flex w-full flex-col gap-2">
                  <label className="font-ui text-sm font-bold text-slate-700">
                    Message
                  </label>
                  <textarea
                    placeholder="Write your message here..."
                    className="w-full min-h-[120px] p-4 rounded-lg border border-slate-200 bg-slate-50/50 font-body text-sm text-slate-900 outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                  />
                </div>

                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 rounded-full font-ui text-base font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all px-6 py-3 cursor-pointer shadow-xs"
                  >
                    Send Message
                    <ArrowRight className="size-5" />
                  </button>
                </div>
              </div>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
