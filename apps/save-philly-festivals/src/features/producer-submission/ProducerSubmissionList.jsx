"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { producerApi } from "./producer-api";

const statusLabels = {
  draft: "Draft",
  changes_requested: "Changes requested",
  pending_review: "Pending review",
};

export default function ProducerSubmissionList({ compact = false }) {
  const [state, setState] = useState({ loading: true, festivals: [], error: "" });

  useEffect(() => {
    let active = true;
    producerApi.list()
      .then(({ festivals }) => active && setState({ loading: false, festivals, error: "" }))
      .catch((error) => active && setState({ loading: false, festivals: [], error: error.message }));
    return () => { active = false; };
  }, []);

  if (state.loading) return <p role="status" className="rounded-xl border bg-white p-6 text-slate-600">Loading submissions…</p>;
  if (state.error) return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{state.error}</p>;
  if (!state.festivals.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-600">You do not have any submissions yet.</p>
        <Link href="/producer/submit" className="mt-4 inline-flex rounded-md bg-black px-5 py-3 font-semibold text-white">Start a submission</Link>
      </div>
    );
  }

  const festivals = compact ? state.festivals.slice(0, 3) : state.festivals;
  return (
    <div className="grid min-w-0 gap-4">
      {festivals.map((festival) => (
        <article key={festival.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <h2 className="truncate font-heading text-xl font-bold">{festival.name || "Untitled festival"}</h2>
              <p className="mt-1 text-sm text-slate-500">Updated {new Date(festival.updated_at).toLocaleDateString()}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{statusLabels[festival.workflow_state] || festival.workflow_state}</span>
              <Link href={`/producer/submit?id=${encodeURIComponent(festival.id)}`} className="rounded-md border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-50">
                {festival.workflow_state === "pending_review" ? "View" : "Resume"}
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
