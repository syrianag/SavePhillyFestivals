import Link from "next/link";

export const metadata = {
  title: "Submit a festival - Save Philly Festivals",
  description: "Learn how Philadelphia festival producers can submit an event for review.",
};

export default function ProducerIntroductionPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
      <section className="overflow-hidden rounded-3xl bg-[#1E7BF6] px-6 py-14 text-white sm:px-12 sm:py-20">
        <p className="font-ui text-sm font-bold uppercase tracking-widest text-[#F6C847]">For festival producers</p>
        <h1 className="mt-4 max-w-3xl font-heading text-4xl font-bold leading-tight sm:text-6xl">Showcase your festival across Philadelphia</h1>
        <p className="mt-6 max-w-2xl font-body text-lg leading-relaxed text-blue-50">Create a private draft, provide accurate festival and contact details, and submit it to the Save Philly Festivals team for review. Submissions do not become public automatically.</p>
        <Link href="/producer/submit" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-black px-6 py-3 font-ui font-bold text-white hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Start or resume a submission</Link>
      </section>
      <section className="grid gap-6 py-12 sm:grid-cols-3" aria-label="Submission process">
        <div><h2 className="font-heading text-xl font-bold">1. Sign in</h2><p className="mt-2 text-slate-600">Use a verified producer account. The login flow returns you to the secure submission editor.</p></div>
        <div><h2 className="font-heading text-xl font-bold">2. Save a private draft</h2><p className="mt-2 text-slate-600">Add festival, location, date, and private contact information at your own pace.</p></div>
        <div><h2 className="font-heading text-xl font-bold">3. Submit for review</h2><p className="mt-2 text-slate-600">Confirm the information and send it to the team. Public listing remains subject to editorial approval.</p></div>
      </section>
    </div>
  );
}
