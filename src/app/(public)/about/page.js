"use client";

import { useState } from "react";
import { CrossBlock, QuadrantBlock } from "@/components/shared/DecorativeBlocks";
import { SectionHeading } from "@/components/home/SectionHeading";
import { Reveal } from "@/components/home/Reveal";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Clock, Mail } from "lucide-react";

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

const CONFETTI = [
  { left: "12%", top: "4px", width: "8px", height: "24px", bg: "bg-brand-yellow", rotate: "-20deg", radius: "4px" },
  { left: "22%", top: "16px", width: "6px", height: "18px", bg: "bg-brand-orange", rotate: "35deg", radius: "3px" },
  { left: "35%", top: "2px", width: "10px", height: "10px", bg: "bg-primary", rotate: "45deg", radius: "2px" },
  { left: "48%", top: "8px", width: "7px", height: "20px", bg: "bg-accent/70", rotate: "-15deg", radius: "3px" },
  { left: "58%", top: "0px", width: "9px", height: "9px", bg: "bg-secondary", rotate: "25deg", radius: "2px" },
  { left: "68%", top: "12px", width: "6px", height: "22px", bg: "bg-accent", rotate: "-30deg", radius: "3px" },
  { left: "78%", top: "4px", width: "8px", height: "8px", bg: "bg-brand-yellow/70", rotate: "60deg", radius: "2px" },
  { left: "88%", top: "10px", width: "7px", height: "16px", bg: "bg-brand-orange/80", rotate: "-10deg", radius: "3px" },
  { left: "15%", top: "32px", width: "6px", height: "14px", bg: "bg-[#C7B7FF]", rotate: "40deg", radius: "3px" },
  { left: "72%", top: "28px", width: "8px", height: "20px", bg: "bg-[#11A858]", rotate: "-25deg", radius: "3px" },
];

const TABS = [
  { id: "mission", label: "Our Mission" },
  { id: "contact", label: "Contact" },
];

export default function AboutPage() {
  const [activeTab, setActiveTab] = useState("mission");
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [contactState, setContactState] = useState({ loading: false, error: "", success: false });

  function updateContactField(field, value) {
    setContactForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleContactSubmit(e) {
    e.preventDefault();
    setContactState({ loading: true, error: "", success: false });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to send message");
      }

      setContactState({ loading: false, error: "", success: true });
    } catch (err) {
      setContactState({ loading: false, error: err.message, success: false });
    }
  }

  return (
    <div className="relative overflow-hidden">
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
      <div className="absolute -left-16 top-24 h-52 w-52 rounded-full bg-primary opacity-10 blur-3xl" />
      <div className="absolute -right-16 top-1/3 h-56 w-56 rounded-full bg-accent opacity-10 blur-3xl" />
      <div className="absolute bottom-40 left-1/3 h-52 w-52 rounded-full bg-brand-yellow opacity-20 blur-3xl" />

      <div className="relative mx-auto max-w-[1440px] px-4 md:px-[81px]">
        {/* Hero */}
        <section className="pb-10 pt-12 md:pb-14 md:pt-[72px]">
          <Reveal>
            <div className="flex flex-col items-center text-center">
              <span className="mb-4 inline-block rounded-full bg-brand-yellow/25 px-4 py-1.5 font-ui text-sm font-semibold text-brand-dark">
                About
              </span>
              <h1 className="font-heading text-4xl font-bold leading-tight text-foreground md:text-5xl lg:text-6xl">
                About <span className="text-accent">Philly</span> Fest
              </h1>
              <p className="mt-6 max-w-2xl font-serif text-lg leading-relaxed text-muted-foreground md:text-xl">
                The story behind the platform preserving, promoting, and celebrating
                Philadelphia&apos;s festival culture.
              </p>
            </div>
          </Reveal>

          {/* Decorative blocks row */}
          <Reveal delay={100}>
            <div className="mx-auto mt-10 flex w-full max-w-[660px] items-center justify-center gap-6 md:mt-14 md:gap-10">
              <div
                className="relative shrink-0"
                style={{ width: 110, height: 110, backgroundColor: "#1E7BF6", borderRadius: "16px" }}
              >
                <div
                  className="absolute"
                  style={{ left: "29.33%", right: "29.33%", top: "37.33%", bottom: "37.33%", backgroundColor: "#50DEF1" }}
                />
              </div>
              <CrossBlock bgColor="#FF93F0" patternColor="#FB439B" size={110} />
              <QuadrantBlock bgColor="#FF6602" patternColor="#F6C847" size={110} />
            </div>
          </Reveal>

          {/* Tab bar */}
          <Reveal delay={200}>
            <div className="mx-auto mt-10 flex w-full max-w-[420px] items-center justify-center gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-pressed={activeTab === tab.id}
                  className="rounded-full border px-6 py-2.5 font-ui text-sm font-medium transition-colors"
                  style={{
                    borderColor: activeTab === tab.id ? "var(--color-primary)" : "var(--color-border)",
                    backgroundColor: activeTab === tab.id ? "var(--color-primary)" : "var(--color-background)",
                    color: activeTab === tab.id ? "var(--color-primary-foreground)" : "var(--color-foreground)",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </Reveal>
        </section>

        {activeTab === "mission" ? (
          <>
            {/* Our Mission content */}
            <section className="mx-auto w-full max-w-4xl pb-8">
              <Reveal>
                <div className="relative mb-8 h-16 w-full">
                  {CONFETTI.map((c, i) => (
                    <div
                      key={i}
                      className={`absolute ${c.bg}`}
                      style={{
                        left: c.left,
                        top: c.top,
                        width: c.width,
                        height: c.height,
                        transform: `rotate(${c.rotate})`,
                        borderRadius: c.radius,
                      }}
                    />
                  ))}
                </div>

                <div className="text-center">
                  <span className="inline-block rounded-full bg-brand-yellow/25 px-4 py-1.5 font-ui text-sm font-semibold text-brand-dark">
                    Mission
                  </span>
                  <h2 className="mx-auto mt-4 max-w-3xl font-serif text-[28px] leading-[34px] text-foreground md:text-[32px] md:leading-[40px]">
                    Our mission is simple — to preserve, promote, and celebrate the rich festival culture of Philadelphia.
                  </h2>
                  <p className="mt-3 font-body text-base text-muted-foreground">
                    We believe that festivals are the heartbeat of our city.
                  </p>
                </div>
              </Reveal>

              <div className="mx-auto mt-10 flex max-w-[888px] flex-col gap-6">
                <Reveal>
                  <p className="font-body text-lg leading-[22px] text-foreground">
                    Philadelphia&apos;s festival culture runs deep — from the vibrant block parties in
                    West Philly to the cultural celebrations in Kensington, the food festivals in South
                    Philly to the art walks in Center City. These gatherings are more than just events;
                    they&apos;re the threads that weave together the diverse communities that make
                    Philadelphia the City of Brotherly Love and Sisterly Affection.
                  </p>
                </Reveal>
                <Reveal delay={80}>
                  <p className="font-body text-lg leading-[22px] text-foreground">
                    Save Philly Festivals was created to document, support, and amplify these community
                    celebrations. We work with neighborhood organizers, local businesses, and cultural
                    institutions to ensure that Philadelphia&apos;s festival traditions continue to thrive for
                    generations to come. By providing resources, promotion, and a centralized platform,
                    we help festival organizers reach wider audiences and build stronger communities.
                  </p>
                </Reveal>
              </div>

              {/* Image row with gradient bar */}
              <Reveal delay={120}>
                <div className="mt-12 flex gap-5 md:mt-14">
                  <div
                    className="shrink-0 rounded-2xl"
                    style={{ width: "19px", height: "456px", background: "linear-gradient(180deg, #C7B7FF 0%, #1E7BF6 50%, #206C4E 100%)" }}
                  />
                  <div className="relative flex w-full items-center justify-center rounded-2xl border border-border bg-muted shadow-sm" style={{ height: "456px" }}>
                    <span className="font-ui text-sm text-muted-foreground">Add Photo</span>
                    {/* Play button overlay */}
                    <div className="absolute flex size-[72px] items-center justify-center rounded-full bg-white/80 shadow-lg">
                      <svg width="24" height="28" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 2L22 14L2 26V2Z" fill="var(--color-primary)" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Reveal>
            </section>

            {/* Sponsors section */}
            <section className="bg-muted py-16 md:py-24">
              <div className="mx-auto max-w-[1440px] px-4 md:px-[81px]">
                <Reveal>
                  <SectionHeading
                    eyebrow="Partners"
                    title="Our Sponsors"
                    description="We&apos;re grateful for the support of our incredible community partners."
                  />
                </Reveal>

                <div className="mt-10 grid grid-cols-1 gap-6 md:mt-14 md:grid-cols-3">
                  {SPONSORS.map((sponsor, i) => (
                    <Reveal key={sponsor.name} delay={i * 80} className="h-full">
                      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-lg">
                        <div className="flex h-40 items-center justify-center bg-muted">
                          <span className="font-ui text-sm text-muted-foreground">Sponsor Logo</span>
                        </div>
                        <div className="flex flex-1 items-center justify-center px-4 py-5">
                          <div
                            className="inline-flex items-center justify-center px-6 py-2"
                            style={{ backgroundColor: sponsor.pillColor, borderRadius: "23px" }}
                          >
                            <span className="font-heading text-[22px] font-medium leading-[26px] text-black">
                              {sponsor.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : (
          <>
            {/* Contact content */}
            <section className="mx-auto w-full max-w-5xl pb-24 pt-2">
              <Reveal>
                <SectionHeading
                  eyebrow="Contact"
                  title="Contact Us"
                  description="Questions, partnership ideas, or a festival to submit? We&apos;d love to hear from you."
                />
              </Reveal>

              <div className="mt-10 grid grid-cols-1 gap-6 md:mt-14 md:grid-cols-3">
                {/* Contact info cards */}
                <Reveal className="h-full">
                  <div className="flex h-full flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <div className="inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <MapPin className="size-6" />
                    </div>
                    <div>
                      <h3 className="font-heading text-lg font-bold text-foreground">
                        Office Address
                      </h3>
                      <p className="mt-2 font-body text-base leading-relaxed text-muted-foreground">
                        1234 Market Street, Suite 200
                        <br />
                        Philadelphia, PA 19107
                      </p>
                    </div>
                  </div>
                </Reveal>

                <Reveal delay={80} className="h-full">
                  <div className="flex h-full flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <div className="inline-flex size-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <Clock className="size-6" />
                    </div>
                    <div>
                      <h3 className="font-heading text-lg font-bold text-foreground">
                        Business Hours
                      </h3>
                      <p className="mt-2 font-ui text-base leading-relaxed text-muted-foreground">
                        Monday — Friday: 9:00 AM — 5:00 PM
                        <br />
                        Saturday — Sunday: Closed
                      </p>
                    </div>
                  </div>
                </Reveal>

                <Reveal delay={160} className="h-full">
                  <div className="flex h-full flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <div className="inline-flex size-12 items-center justify-center rounded-xl bg-brand-yellow/25 text-yellow-600">
                      <Mail className="size-6" />
                    </div>
                    <div>
                      <h3 className="font-heading text-lg font-bold text-foreground">
                        Support
                      </h3>
                      <p className="mt-2 font-ui text-base leading-relaxed text-muted-foreground">
                        info@savephillyfestivals.org
                        <br />
                        (215) 555-0142
                      </p>
                    </div>
                  </div>
                </Reveal>
              </div>

              {/* Contact form */}
              <Reveal delay={120}>
                <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm md:p-10">
                  {contactState.success ? (
                    <div className="flex flex-col items-center py-8 text-center">
                      <h3 className="font-heading text-xl font-bold text-foreground">
                        Message Sent
                      </h3>
                      <p className="mt-2 max-w-sm font-body text-base text-muted-foreground">
                        Thank you for reaching out. We&apos;ll get back to you soon.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleContactSubmit}>
                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-8">
                        <div className="flex flex-col gap-2">
                          <label className="font-heading text-base font-bold text-foreground">
                            Your Name
                          </label>
                          <input
                            type="text"
                            required
                            value={contactForm.name}
                            onChange={(e) => updateContactField("name", e.target.value)}
                            placeholder="Enter your full name"
                            className="w-full border-b pb-2 font-body text-base leading-[19px] text-muted-foreground outline-none transition-colors focus:border-primary"
                            style={{ borderBottomColor: "var(--color-border)" }}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="font-heading text-base font-bold text-foreground">
                            Email Address
                          </label>
                          <input
                            type="email"
                            required
                            value={contactForm.email}
                            onChange={(e) => updateContactField("email", e.target.value)}
                            placeholder="Enter your email address"
                            className="w-full border-b pb-2 font-body text-base leading-[19px] text-muted-foreground outline-none transition-colors focus:border-primary"
                            style={{ borderBottomColor: "var(--color-border)" }}
                          />
                        </div>
                      </div>

                      <div className="mt-6 flex flex-col gap-2">
                        <label className="font-heading text-base font-bold text-foreground">
                          Message
                        </label>
                        <textarea
                          required
                          value={contactForm.message}
                          onChange={(e) => updateContactField("message", e.target.value)}
                          placeholder="Write your message here..."
                          className="w-full resize-none border-b pb-2 font-body text-base leading-[19px] text-muted-foreground outline-none transition-colors focus:border-primary"
                          style={{ borderBottomColor: "var(--color-border)", minHeight: "146px" }}
                        />
                      </div>

                      {contactState.error && (
                        <p className="mt-4 text-sm text-destructive">
                          {contactState.error}
                        </p>
                      )}

                      <div className="mt-8 flex justify-end">
                        <Button type="submit" disabled={contactState.loading} className="gap-2 px-8 py-6 text-base">
                          {contactState.loading ? "Sending..." : "Send Message"}
                          {!contactState.loading && <ArrowRight className="size-5" />}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </Reveal>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
