import Link from "next/link";

export const metadata = {
  title: "Submit a festival - Save Philly Festivals",
  description: "Learn how Philadelphia festival producers can submit an event for review.",
};

/* Each advertised step links to the route that actually performs it, so the 1-2-3 is navigable
 * rather than display-only copy. Step 1 was "Sign in", which quietly assumed somebody had
 * already created the account for you — there was no way to register at all. */
const SUBMISSION_STEPS = [
  {
    href: "/producer/apply",
    title: "1. Apply",
    body: "One form creates your account and submits your event. Our team reviews both together and emails you the decision.",
    action: "Become a producer",
  },
  {
    href: "/producer/submit",
    title: "2. Create a draft",
    body: "Add festival, location, date, and private contact information at your own pace. Drafts stay private.",
    action: "Start a draft",
  },
  {
    href: "/producer/dashboard",
    title: "3. Track your submission",
    body: "Follow its status through review, read the team's feedback, and resubmit if changes are requested.",
    action: "Track your submissions",
  },
];

export default function ProducerIntroductionPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
      <section className="overflow-hidden rounded-3xl bg-[#1E7BF6] px-6 py-14 text-white sm:px-12 sm:py-20">
        <p className="font-ui text-sm font-bold uppercase tracking-widest text-[#F6C847]">For festival producers</p>
        <h1 className="mt-4 max-w-3xl font-heading text-4xl font-bold leading-tight sm:text-6xl">Showcase your festival for free across Philadelphia</h1>
        <p className="mt-6 max-w-2xl font-body text-lg leading-relaxed text-blue-50">Create a private draft, provide accurate festival and contact details, and submit it to the Save Philly Festivals team for review. Submissions do not become public automatically.</p>
        {/* Two entry points, because they serve different people: newcomers have no account
          * and want one form, while returning producers just want their draft back. */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/producer/apply" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-black px-6 py-3 font-ui font-bold text-white hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Become a producer &amp; submit your event</Link>
          <Link href="/producer/submit" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white/10 px-6 py-3 font-ui font-bold text-white ring-1 ring-white/40 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Resume a submission</Link>
        </div>
      </section>
      <section className="grid gap-6 py-12 sm:grid-cols-3" aria-label="Submission process">
        {SUBMISSION_STEPS.map((step) => (
          <Link
            key={step.href}
            href={step.href}
            className="group rounded-2xl border border-slate-200/60 bg-white p-5 shadow-2xs transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal"
          >
            <h2 className="font-heading text-xl font-bold group-hover:text-brand-teal">{step.title}</h2>
            <p className="mt-2 text-slate-600">{step.body}</p>
            <span aria-hidden="true" className="mt-3 inline-block font-ui text-sm font-bold text-brand-teal">
              {step.action} &rarr;
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
