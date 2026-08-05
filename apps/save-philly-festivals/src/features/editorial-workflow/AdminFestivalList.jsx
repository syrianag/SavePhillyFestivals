import Link from "next/link";

import { PUBLICATION_STATES } from "./publication-policy";

export default function AdminFestivalList({ festivals, selectedState }) {
  return (
    <div className="space-y-6">
      <nav aria-label="Festival state filters" className="flex flex-wrap gap-2">
        <Link className={`rounded-full border px-3 py-2 text-sm ${!selectedState ? "bg-black text-white" : "bg-white"}`} href="/admin/festivals">All</Link>
        {PUBLICATION_STATES.map((state) => <Link key={state} className={`rounded-full border px-3 py-2 text-sm ${selectedState === state ? "bg-black text-white" : "bg-white"}`} href={`/admin/festivals?state=${state}`}>{state.replaceAll("_", " ")}</Link>)}
      </nav>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[680px] text-left">
          <thead><tr className="border-b bg-slate-50 text-sm"><th className="p-4">Festival</th><th className="p-4">State</th><th className="p-4">Revision</th><th className="p-4">Updated</th><th className="p-4">Action</th></tr></thead>
          <tbody>{festivals.length ? festivals.map((festival) => <tr key={festival.id} className="border-b last:border-0"><td className="p-4 font-semibold">{festival.name || "Untitled festival"}</td><td className="p-4">{festival.workflow_state.replaceAll("_", " ")}</td><td className="p-4">{festival.revision}</td><td className="p-4">{new Date(festival.updated_at).toLocaleString()}</td><td className="p-4"><Link className="font-semibold underline" href={`/admin/festivals/${festival.id}`}>Review</Link></td></tr>) : <tr><td className="p-8 text-center text-slate-600" colSpan={5}>No festivals match this state.</td></tr>}</tbody>
        </table>
      </div>
    </div>
  );
}
