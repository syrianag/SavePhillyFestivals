"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const statusVariant = { pending: "secondary", approved: "default", rejected: "destructive", withdrawn: "outline" };

export default function AdminProducerRequests({ initialRequests, emailsEnabled }) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [active, setActive] = useState(null);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState({ pending: false, error: "", notice: "" });

  function open(request, decision) {
    setActive({ request, decision });
    setReason("");
    setStatus({ pending: false, error: "", notice: "" });
  }

  async function submit(event) {
    event.preventDefault();
    if (active.decision === "rejected" && !reason.trim()) {
      setStatus({ pending: false, error: "A reason is required when declining — the applicant sees it.", notice: "" });
      return;
    }
    setStatus({ pending: true, error: "", notice: "" });
    try {
      const response = await fetch(`/api/admin/producer-requests/${encodeURIComponent(active.request.id)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision: active.decision, ...(reason.trim() ? { reason: reason.trim() } : {}) }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus({ pending: false, error: body?.error || "The decision could not be saved.", notice: "" });
        return;
      }
      setRequests((current) => current.map((item) => (item.id === body.request.id ? body.request : item)));
      setActive(null);
      /* Report delivery honestly: the decision has committed regardless, and an editor who
       * believes an applicant was emailed when they weren't will not follow up. */
      setStatus({
        pending: false,
        error: "",
        notice: body.notification?.delivered
          ? "Decision saved and the applicant was emailed."
          : `Decision saved. No email was sent (${body.notification?.reason || "unknown"}).`,
      });
      router.refresh();
    } catch {
      setStatus({ pending: false, error: "The decision could not be saved.", notice: "" });
    }
  }

  const pending = requests.filter((request) => request.status === "pending");
  const decided = requests.filter((request) => request.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-slate-900">Producer access requests</h1>
        <p className="mt-1 text-sm text-slate-500">
          Approving grants the producer role, which lets the account submit festivals. Submissions
          still go through editorial review before anything is published.
        </p>
        {!emailsEnabled && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Account emails are currently off, so applicants are not notified of decisions. Set
            <code className="mx-1 rounded bg-amber-100 px-1">ACCOUNT_EMAILS_ENABLED=1</code>
            and a Resend API key to turn them on.
          </p>
        )}
      </div>

      {status.notice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{status.notice}</p>}
      {status.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{status.error}</p>}

      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader><CardTitle className="font-heading">Awaiting review ({pending.length})</CardTitle></CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing waiting.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pending.map((request) => (
                <li key={request.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{request.user.name || request.user.email}</p>
                    <p className="text-sm text-slate-500">{request.user.email}</p>
                    {request.organization && <p className="mt-1 text-sm text-slate-600">Organization: {request.organization}</p>}
                    {request.festival_name && <p className="text-sm text-slate-600">Festival: {request.festival_name}</p>}
                    {request.message && <p className="mt-1 text-sm text-slate-600">{request.message}</p>}
                    {/* Applications from the combined flow carry their event as submitted data;
                      * the real festival only exists after approval. Showing it here is what
                      * lets the reviewer judge applicant and event together. */}
                    {request.proposed_festival && (
                      <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Submitted event{request.festival ? ` · ${request.festival.workflow_state}` : " · awaiting approval"}
                        </p>
                        <p className="mt-1 font-medium text-slate-900">{request.proposed_festival.name}</p>
                        {request.proposed_festival.description && (
                          <p className="mt-1 line-clamp-3 text-sm text-slate-600">{request.proposed_festival.description}</p>
                        )}
                        {(request.proposed_festival.location || request.proposed_festival.city) && (
                          <p className="mt-1 text-sm text-slate-600">
                            {[request.proposed_festival.location, request.proposed_festival.city].filter(Boolean).join(", ")}
                          </p>
                        )}
                        {!request.festival && (
                          <p className="mt-2 text-xs text-slate-500">
                            Approving creates this event and places it in the review queue.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={() => open(request, "approved")}>
                      <Check className="size-4" aria-hidden="true" /> Approve
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => open(request, "rejected")}>
                      <X className="size-4" aria-hidden="true" /> Decline
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader><CardTitle className="font-heading">Decided ({decided.length})</CardTitle></CardHeader>
        <CardContent>
          {decided.length === 0 ? (
            <p className="text-sm text-slate-500">No decisions yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {decided.map((request) => (
                <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{request.user.name || request.user.email}</p>
                    <p className="text-sm text-slate-500">{request.user.email}</p>
                    {request.decision_reason && <p className="mt-1 text-sm text-slate-600">{request.decision_reason}</p>}
                  </div>
                  <Badge variant={statusVariant[request.status]}>{request.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(active)} onOpenChange={(next) => !next && setActive(null)}>
        <DialogContent>
          {active && (
            <form onSubmit={submit}>
              <DialogHeader>
                <DialogTitle className="font-heading">
                  {active.decision === "approved" ? "Approve producer access" : "Decline producer access"}
                </DialogTitle>
                <DialogDescription>
                  {active.decision === "approved"
                    ? `${active.request.user.email} will be able to submit festivals.`
                    : `${active.request.user.email} will see this reason and can request again.`}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="decision-reason">
                  Reason {active.decision === "rejected" ? <span className="font-normal text-slate-400">(Required)</span> : <span className="font-normal text-slate-400">(Optional)</span>}
                </Label>
                <textarea
                  id="decision-reason"
                  className="w-full min-h-24 rounded-lg border border-slate-200 p-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  value={reason}
                  required={active.decision === "rejected"}
                  maxLength={2000}
                  onChange={(event) => setReason(event.target.value)}
                />
                <span className="mt-1 block text-xs text-slate-500">Included in the email to the applicant.</span>
              </div>
              {status.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{status.error}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setActive(null)}>Cancel</Button>
                <Button type="submit" disabled={status.pending}>
                  {status.pending ? "Saving…" : active.decision === "approved" ? "Approve" : "Decline"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
