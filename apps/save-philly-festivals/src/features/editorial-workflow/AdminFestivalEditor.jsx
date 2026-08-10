"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/* Content fields an editor is realistically correcting on an imported listing. Workflow state
 * is deliberately absent — that stays on the transitions endpoint so the transition policy
 * cannot be bypassed by a content edit. */
const TEXT_FIELDS = [
  { key: "name", label: "Festival name", required: true },
  { key: "location", label: "Location" },
  { key: "city", label: "City" },
  { key: "state", label: "State", placeholder: "PA", maxLength: 2 },
  { key: "zip_code", label: "ZIP code", placeholder: "19106" },
  { key: "website_url", label: "Website URL", type: "url" },
  { key: "image_url", label: "Image URL", type: "url" },
  { key: "contact_name", label: "Contact name" },
  { key: "contact_email", label: "Contact email", type: "email" },
  { key: "contact_phone", label: "Contact phone" },
];

function toCalendarDate(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function initialForm(festival) {
  const form = { description: festival.description ?? "" };
  for (const { key } of TEXT_FIELDS) form[key] = festival[key] ?? "";
  form.all_day_start = toCalendarDate(festival.all_day_start);
  form.all_day_end = toCalendarDate(festival.all_day_end);
  form.featured = Boolean(festival.featured);
  form.featured_rank = festival.featured_rank ?? "";
  return form;
}

export default function AdminFestivalEditor({ festival, onSaved }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => initialForm(festival));
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState({ pending: false, error: "" });

  const isAllDay = festival.calendar_date_type === "all_day";

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openEditor() {
    setForm(initialForm(festival));
    setReason("");
    setStatus({ pending: false, error: "" });
    setOpen(true);
  }

  /* Only changed fields are sent. A blanket PATCH of every field would bump the revision and
   * write an audit entry even when nothing actually changed. */
  function changedPayload() {
    const payload = {};
    for (const { key } of TEXT_FIELDS) {
      const next = form[key].trim();
      const previous = festival[key] ?? "";
      if (next !== previous) payload[key] = key === "name" ? next : (next || null);
    }
    const description = form.description.trim();
    if (description !== (festival.description ?? "")) payload.description = description || null;

    if (isAllDay) {
      if (form.all_day_start !== toCalendarDate(festival.all_day_start)) payload.all_day_start = form.all_day_start || null;
      if (form.all_day_end !== toCalendarDate(festival.all_day_end)) payload.all_day_end = form.all_day_end || null;
    }

    if (form.featured !== Boolean(festival.featured)) payload.featured = form.featured;
    const rank = form.featured_rank === "" ? null : Number(form.featured_rank);
    if (rank !== (festival.featured_rank ?? null)) payload.featured_rank = rank;
    return payload;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!reason.trim()) {
      setStatus({ pending: false, error: "An internal reason is required — it is what keeps the edit attributable." });
      return;
    }
    const payload = changedPayload();
    if (!Object.keys(payload).length) {
      setStatus({ pending: false, error: "Nothing has changed." });
      return;
    }

    setStatus({ pending: true, error: "" });
    try {
      const response = await fetch(`/api/admin/festivals/${encodeURIComponent(festival.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expected_revision: festival.revision, reason: reason.trim(), ...payload }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus({
          pending: false,
          error: body?.issues?.length
            ? body.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")
            : body?.error || "The edit could not be saved.",
        });
        return;
      }
      setOpen(false);
      setStatus({ pending: false, error: "" });
      onSaved?.(body.festival);
      router.refresh();
    } catch {
      setStatus({ pending: false, error: "The edit could not be saved." });
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={openEditor}>
          <Pencil className="size-4" aria-hidden="true" />
          Edit details
        </Button>
        {festival.featured && (
          <Badge variant="secondary">
            <Star className="size-3" aria-hidden="true" />
            Featured{festival.featured_rank != null ? ` · #${festival.featured_rank}` : ""}
          </Badge>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="font-heading">Edit festival details</DialogTitle>
              <DialogDescription>
                Saves without changing the workflow state. Every edit records an internal reason
                and a revision snapshot.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 sm:grid-cols-2">
              {TEXT_FIELDS.map((field) => (
                <div key={field.key} className={field.key === "name" ? "sm:col-span-2" : ""}>
                  <Label htmlFor={`festival-${field.key}`}>{field.label}</Label>
                  <Input
                    id={`festival-${field.key}`}
                    type={field.type || "text"}
                    value={form[field.key]}
                    placeholder={field.placeholder}
                    maxLength={field.maxLength}
                    required={field.required}
                    onChange={(event) => update(field.key, event.target.value)}
                  />
                </div>
              ))}

              <div className="sm:col-span-2">
                <Label htmlFor="festival-description">Description</Label>
                <textarea
                  id="festival-description"
                  className="w-full min-h-24 rounded-lg border border-slate-200 p-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  value={form.description}
                  maxLength={10000}
                  onChange={(event) => update("description", event.target.value)}
                />
                <span className="block text-[11px] leading-tight text-slate-500">
                  Imported festivals arrive without a description; adding one also makes them
                  findable by text search.
                </span>
              </div>

              {isAllDay && (
                <>
                  <div>
                    <Label htmlFor="festival-all-day-start">Start date</Label>
                    <Input
                      id="festival-all-day-start"
                      type="date"
                      value={form.all_day_start}
                      onChange={(event) => update("all_day_start", event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="festival-all-day-end">End date (inclusive)</Label>
                    <Input
                      id="festival-all-day-end"
                      type="date"
                      value={form.all_day_end}
                      onChange={(event) => update("all_day_end", event.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-2">
                <input
                  id="festival-featured"
                  type="checkbox"
                  className="size-4 rounded border-slate-300"
                  checked={form.featured}
                  onChange={(event) => update("featured", event.target.checked)}
                />
                <Label htmlFor="festival-featured">Feature on the homepage</Label>
              </div>
              <div>
                <Label htmlFor="festival-featured-rank">Featured order</Label>
                <Input
                  id="festival-featured-rank"
                  type="number"
                  min={0}
                  max={9999}
                  value={form.featured_rank}
                  placeholder="Lower shows first"
                  onChange={(event) => update("featured_rank", event.target.value)}
                />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="festival-edit-reason">
                  Internal reason <span className="font-normal text-slate-400">(Required)</span>
                </Label>
                <textarea
                  id="festival-edit-reason"
                  className="w-full min-h-17.5 rounded-lg border border-slate-200 p-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  placeholder="e.g. Corrected the venue name from the source spreadsheet"
                  value={reason}
                  required
                  maxLength={2000}
                  onChange={(event) => setReason(event.target.value)}
                />
                <span className="block text-[11px] leading-tight text-slate-500">
                  Recorded in the festival&apos;s history. Never shown to producers or visitors.
                </span>
              </div>
            </div>

            {status.error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {status.error}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={status.pending}>
                {status.pending ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
