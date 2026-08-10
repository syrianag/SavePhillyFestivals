import Link from "next/link";

export const metadata = {
  title: "Submit a festival - Save Philly Festivals",
  description: "Learn how Philadelphia festival producers can submit an event for review — free.",
};

/* Each advertised stage links to the route that actually performs it, so the 1-2-3-4 is
 * navigable rather than display-only copy. Stage 1 offers sign-in and free producer
 * signup so a brand-new organizer can complete the whole flow without a staff account. */
const SUBMISSION_STAGES = [
  {
    href: "/register?callbackUrl=%2Fproducer%2Fsubmit",
    title: "1. Create your free account",
    body: "Sign up as a producer (or sign in if you already have an account). Creating a submission costs nothing.",
    action: "Sign up free",
  },
  {
    href: "/producer/submit",
    title: "2. Save a private draft",
    body: "Add festival, location, date, and private contact information at your own pace.",
    action: "Start a draft",
  },
  {
    href: "/producer/submit",
    title: "3. Add your story & photos",
    body: "Describe what makes your festival special and attach images for the team to review.",
    action: "Add details",
  },
  {
    href: "/producer/dashboard",
    title: "4. Submit for review",
    body: "Confirm the information and send it to the team. Public listing remains subject to editorial approval.",
    action: "Track your submission",
  },
];

export default function ProducerIntroductionPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
      <section className="overflow-hidden rounded-3xl bg-[#1E7BF6] px-6 py-14 text-white sm:px-12 sm:py-20">
        <p className="font-ui text-sm font-bold uppercase tracking-widest text-[#F6C847]">For festival producers</p>
        <h1 className="mt-4 max-w-3xl font-heading text-4xl font-bold leading-tight sm:text-6xl">Showcase your festival for free across Philadelphia</h1>
        <p className="mt-6 max-w-2xl font-body text-lg leading-relaxed text-blue-50">Create a private draft, provide accurate festival and contact details, and submit it to the Save Philly Festivals team for review. Submissions do not become public automatically.</p>
        <Link href="/producer/submit" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-black px-6 py-3 font-ui font-bold text-white hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Start or resume a submission</Link>
      </section>

      <section className="py-14">
        <div className="text-center">
          <p className="font-ui text-sm font-bold uppercase tracking-widest text-[#62748E]">How it works</p>
          <h2 className="mt-3 font-heading text-3xl font-bold text-[#0F172B] sm:text-4xl">
            Submit your festival in four simple stages, <span className="text-[#206C4E]">for FREE</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl font-body text-slate-600">
            There are no fees to submit or list your festival. Build your submission at your own pace, and the team
            reviews it before anything goes public.
          </p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {SUBMISSION_STAGES.map((stage) => (
            <Link
              key={stage.href + stage.title}
              href={stage.href}
              className="group rounded-2xl border border-slate-200/60 bg-white p-6 shadow-2xs transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal"
            >
              <h3 className="font-heading text-xl font-bold group-hover:text-brand-teal">{stage.title}</h3>
              <p className="mt-2 text-slate-600">{stage.body}</p>
              <span aria-hidden="true" className="mt-4 inline-block font-ui text-sm font-bold text-brand-teal">
                {stage.action} &rarr;
              </span>
            </Link>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register?callbackUrl=%2Fproducer%2Fsubmit"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#1E7BF6] px-6 py-3 font-ui font-bold text-white hover:bg-[#1767cf] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1E7BF6]"
          >
            Create a free producer account
          </Link>
          <Link
            href="/login?callbackUrl=%2Fproducer%2Fsubmit"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-ui font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-teal"
          >
            I already have an account
          </Link>
        </div>
      </section>
    </div>
  );
}
