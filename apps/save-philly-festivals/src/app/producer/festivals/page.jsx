import Link from "next/link";

import ProducerSubmissionList from "@/features/producer-submission/ProducerSubmissionList";

export const metadata = { title: "My submissions - Save Philly Festivals" };

export default function ProducerFestivalsPage() {
  return (
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-heading text-3xl font-bold sm:text-4xl">My submissions</h1>
          <p className="mt-2 text-slate-600">Drafts stay private. Submitted festivals remain private until approved.</p>
        </div>
        <Link href="/producer/submit" className="inline-flex justify-center rounded-md bg-black px-5 py-3 font-semibold text-white">New submission</Link>
      </header>
      <ProducerSubmissionList />
    </div>
  );
}
