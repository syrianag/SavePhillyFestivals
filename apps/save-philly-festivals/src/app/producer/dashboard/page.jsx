import Link from "next/link";

import ProducerSubmissionList from "@/features/producer-submission/ProducerSubmissionList";

export const metadata = { title: "Producer overview - Save Philly Festivals" };

export default function ProducerDashboardPage() {
  return (
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-heading text-3xl font-bold sm:text-4xl">Producer overview</h1>
          <p className="mt-2 text-slate-600">Create, resume, and track festival submissions.</p>
        </div>
        <Link href="/producer/submit" className="inline-flex justify-center rounded-md bg-black px-5 py-3 font-semibold text-white">New submission</Link>
      </header>
      <section aria-labelledby="recent-submissions-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="recent-submissions-heading" className="font-heading text-2xl font-bold">Recent submissions</h2>
          <Link href="/producer/festivals" className="font-semibold text-blue-700 underline-offset-4 hover:underline">View all</Link>
        </div>
        <ProducerSubmissionList compact />
      </section>
    </div>
  );
}
