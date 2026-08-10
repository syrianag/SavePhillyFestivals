"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUS_COPY = {
  pending: {
    variant: "secondary",
    label: "Awaiting review",
    body: "Your request is with the Save Philly Festivals team. We'll email you as soon as it's reviewed.",
  },
  approved: {
    variant: "default",
    label: "Approved",
    body: "You can submit festivals now.",
  },
  rejected: {
    variant: "destructive",
    label: "Not approved",
    body: "Your request wasn't approved.",
  },
  withdrawn: { variant: "outline", label: "Withdrawn", body: "This request was withdrawn." },
};

export default function ProducerAccessPanel() {
  const [state, setState] = useState({ loading: true, role: null, request: null });
  const [form, setForm] = useState({ organization: "", festival_name: "", message: "" });
  const [status, setStatus] = useState({ pending: false, error: "" });

  useEffect(() => {
    let active = true;
    fetch("/api/producer/access")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("load failed"))))
      .then((body) => { if (active) setState({ loading: false, role: body.role, request: body.request }); })
      .catch(() => { if (active) setState({ loading: false, role: null, request: null }); });
    return () => { active = false; };
  }, []);

  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ pending: true, error: "" });
    try {
      const response = await fetch("/api/producer/access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus({ pending: false, error: body?.error || "We couldn't submit the request." });
        return;
      }
      setState((current) => ({ ...current, request: body.request }));
      setStatus({ pending: false, error: "" });
    } catch {
      setStatus({ pending: false, error: "We couldn't submit the request." });
    }
  }

  if (state.loading) {
    return <p role="status" className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Loading…</p>;
  }

  const alreadyProducer = ["producer", "admin", "super_admin"].includes(state.role);
  if (alreadyProducer) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <Badge variant="default">Producer access active</Badge>
        <p className="mt-3 text-slate-600">You can submit and manage festivals.</p>
        <Link href="/producer/submit" className="mt-4 inline-flex rounded-md bg-slate-900 px-5 py-3 font-semibold text-white">
          Start a submission
        </Link>
      </div>
    );
  }

  const request = state.request;
  if (request && request.status !== "rejected") {
    const copy = STATUS_COPY[request.status] || STATUS_COPY.pending;
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <Badge variant={copy.variant}>{copy.label}</Badge>
        <p className="mt-3 text-slate-600">{copy.body}</p>
        <p className="mt-2 text-sm text-slate-500">
          Requested {new Date(request.created_at).toLocaleDateString("en-US", { dateStyle: "long" })}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      {/* A declined applicant can reapply — the reason is shown so the second attempt can
        * actually address it, rather than being a blind retry. */}
      {request?.status === "rejected" && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4">
          <Badge variant="destructive">Not approved</Badge>
          {request.decision_reason && <p className="mt-2 text-sm text-red-800">{request.decision_reason}</p>}
          <p className="mt-2 text-sm text-red-700">You can update the details below and request again.</p>
        </div>
      )}

      <h2 className="font-heading text-xl font-bold text-slate-900">Request producer access</h2>
      <p className="mt-1 text-slate-600">
        Tell us a little about the festival you want to list. Our team reviews every request.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <Label htmlFor="access-org">Organization</Label>
          <Input id="access-org" value={form.organization} maxLength={200}
            onChange={(event) => update("organization", event.target.value)} />
        </div>
        <div>
          <Label htmlFor="access-festival">Festival you want to list</Label>
          <Input id="access-festival" value={form.festival_name} maxLength={200}
            onChange={(event) => update("festival_name", event.target.value)} />
        </div>
        <div>
          <Label htmlFor="access-message">Anything else we should know?</Label>
          <textarea id="access-message" value={form.message} maxLength={2000}
            className="w-full min-h-24 rounded-lg border border-slate-200 p-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            onChange={(event) => update("message", event.target.value)} />
        </div>

        {status.error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{status.error}</p>
        )}

        <Button type="submit" disabled={status.pending}>
          {status.pending ? "Submitting…" : "Request access"}
        </Button>
      </form>
    </div>
  );
}
