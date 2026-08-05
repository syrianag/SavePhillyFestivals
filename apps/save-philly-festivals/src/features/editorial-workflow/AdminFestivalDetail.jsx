"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const label = (value) => value?.replaceAll("_", " ") || "—";

export default function AdminFestivalDetail({ initialFestival }) {
  const router = useRouter();
  const [festival, setFestival] = useState(initialFestival);
  const [action, setAction] = useState(initialFestival.valid_actions[0] || "");
  const [reason, setReason] = useState("");
  const [producerMessage, setProducerMessage] = useState("");
  const [publicMessage, setPublicMessage] = useState("");
  const [status, setStatus] = useState({ pending: false, error: "", notice: "" });

  async function transition(event) {
    event.preventDefault();
    setStatus({ pending: true, error: "", notice: "" });
    const payload = { expected_revision: festival.revision, to_state: action };
    if (reason.trim()) payload.reason = reason.trim();
    if (producerMessage.trim()) payload.producer_message = producerMessage.trim();
    if (publicMessage.trim()) payload.public_message = publicMessage.trim();
    const response = await fetch(`/api/admin/festivals/${encodeURIComponent(festival.id)}/transitions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus({ pending: false, error: response.status === 409 ? "Revision conflict. Reload before taking another action." : body.error || "Transition failed.", notice: "" });
      return;
    }
    setFestival((current) => ({ ...current, ...body.festival, valid_actions: [] }));
    setStatus({ pending: false, error: "", notice: `Festival moved to ${label(body.festival.workflow_state)}. Notification ${body.notification?.sent ? "sent" : "recorded for follow-up"}.` });
    router.refresh();
  }

  async function retryNotification(notification) {
    setStatus({ pending: true, error: "", notice: "" });
    const response = await fetch(`/api/admin/festivals/${encodeURIComponent(festival.id)}/notifications/${encodeURIComponent(notification.id)}/retry`, { method: "POST" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus({ pending: false, error: body.error || "Notification retry failed.", notice: "" });
      return;
    }
    const delivery = body.notification || {};
    setStatus({ pending: false, error: "", notice: delivery.sent ? "Notification sent." : `Notification remains ${label(delivery.delivery_status)} and is safe to retry.` });
    router.refresh();
  }

  async function reviewAsset(asset, decision) {
    setStatus({ pending: true, error: "", notice: "" });
    const response = await fetch(`/api/admin/festivals/${festival.id}/assets`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expected_festival_revision: festival.revision, asset_id: asset.id, decision, ...(decision === "rejected" ? { reason: "Asset is not suitable for publication." } : {}) }) });
    const body = await response.json().catch(() => ({}));
    setStatus(response.ok ? { pending: false, error: "", notice: `Asset ${decision}.` } : { pending: false, error: body.error || "Asset review failed.", notice: "" });
    if (response.ok) router.refresh();
  }

  return <div className="space-y-8">
    <header><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold">{festival.name || "Untitled festival"}</h1><span className="rounded-full bg-slate-200 px-3 py-1 font-semibold">{label(festival.workflow_state)}</span><span>Revision {festival.revision}</span></div><p className="mt-2 text-slate-600">Private editorial record. Contact and internal reasons are never included in public DTOs.</p></header>
    {status.error && <p role="alert" className="rounded-md bg-red-50 p-4 text-red-900">{status.error}</p>}{status.notice && <p role="status" className="rounded-md bg-green-50 p-4 text-green-900">{status.notice}</p>}
    <section className="grid gap-4 rounded-xl border bg-white p-5 sm:grid-cols-2"><h2 className="text-xl font-bold sm:col-span-2">Submission detail</h2><div><b>Private contact</b><p>{festival.contact_name || "—"}<br />{festival.contact_email || "—"}<br />{festival.contact_phone || "—"}</p></div><div><b>Location</b><p>{festival.location || "—"}<br />{[festival.city, festival.state, festival.zip_code].filter(Boolean).join(" ")}</p></div><div className="sm:col-span-2"><b>Description</b><p className="whitespace-pre-wrap">{festival.description || "—"}</p></div></section>
    {festival.valid_actions.length > 0 && <form onSubmit={transition} className="space-y-4 rounded-xl border bg-white p-5"><h2 className="text-xl font-bold">Editorial action</h2><label className="block font-semibold">Next state<select className="mt-1 block w-full rounded-md border p-3" value={action} onChange={(event) => setAction(event.target.value)}>{festival.valid_actions.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label><label className="block font-semibold">Internal reason<textarea className="mt-1 block w-full rounded-md border p-3" maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} /><span className="text-sm font-normal text-slate-500">Private to editors.</span></label><label className="block font-semibold">Producer message<textarea className="mt-1 block w-full rounded-md border p-3" maxLength={2000} value={producerMessage} onChange={(event) => setProducerMessage(event.target.value)} /><span className="text-sm font-normal text-slate-500">Owner-safe; required for changes requested and rejection.</span></label>{action === "canceled" && <label className="block font-semibold">Public cancellation message<textarea required className="mt-1 block w-full rounded-md border p-3" maxLength={1000} value={publicMessage} onChange={(event) => setPublicMessage(event.target.value)} /></label>}<button disabled={status.pending} className="rounded-md bg-black px-5 py-3 font-semibold text-white disabled:opacity-60">{status.pending ? "Saving…" : `Move to ${label(action)}`}</button></form>}
    <section className="space-y-3"><h2 className="text-xl font-bold">Private assets</h2>{festival.private_assets.length ? festival.private_assets.map((asset) => <article className="rounded-xl border bg-white p-4" key={asset.id}><p><b>{label(asset.purpose)}</b> — {asset.original_filename}</p><p>Scan: {label(asset.scan_status)} · Lifecycle: {label(asset.lifecycle_status)} · Editorial: {label(asset.editorial_status)}</p><p>Alt: {asset.alt_text}</p>{asset.editorial_status === "pending" && <div className="mt-3 flex gap-2"><button onClick={() => reviewAsset(asset, "approved")} className="rounded border px-3 py-2">Approve asset</button><button onClick={() => reviewAsset(asset, "rejected")} className="rounded border px-3 py-2">Reject asset</button></div>}</article>) : <p>No private assets.</p>}</section>
    <section className="space-y-3"><h2 className="text-xl font-bold">Private audit timeline</h2>{festival.workflow_transitions.map((item) => <article key={item.id} className="rounded-xl border bg-white p-4"><p className="font-semibold">{label(item.from_state)} → {label(item.to_state)} · revision {item.revision}</p><p className="text-sm text-slate-500">{new Date(item.created_at).toLocaleString()}</p>{item.reason && <p><b>Internal:</b> {item.reason}</p>}{item.producer_message && <p><b>Producer:</b> {item.producer_message}</p>}{item.public_message && <p><b>Public:</b> {item.public_message}</p>}</article>)}</section>
    <section><h2 className="text-xl font-bold">Notification attempts</h2><ul className="mt-2 space-y-2">{festival.workflow_notifications.map((item) => { const retryNeeded = item.delivery_status === "pending" || (item.delivery_status === "failed" && item.attempts < 5); return <li className="flex flex-wrap items-center justify-between gap-3 rounded border bg-white p-3" key={item.id}><span>Revision {item.workflow_revision}: {label(item.delivery_status)} · attempts {item.attempts}{item.failure_code ? ` · ${item.failure_code}` : ""}{retryNeeded ? " · Retry needed" : ""}</span>{retryNeeded && <button type="button" disabled={status.pending} onClick={() => retryNotification(item)} className="rounded border px-3 py-2 font-semibold disabled:opacity-60">Retry notification</button>}</li>; })}</ul></section>
  </div>;
}
