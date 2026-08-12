"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUSES = ["confirmed", "tentative", "postponed", "canceled"];
const statusVariant = { confirmed: "default", tentative: "secondary", postponed: "outline", canceled: "outline" };

const EMPTY = {
  title: "", description: "", location: "", performer: "", genre: "",
  is_headliner: false, calendar_date_type: "timed", calendar_status: "confirmed",
  start_date: "", start_clock: "", end_date: "", end_clock: "",
  all_day_start: "", all_day_end: "", occurrence_id: "",
};

/* The API speaks ISO instants; the form uses separate date and time inputs because a single
 * datetime-local control is awkward on iPad, which is where this is used. */
function splitInstant(value) {
  if (!value) return { date: "", clock: "" };
  const iso = new Date(value).toISOString();
  return { date: iso.slice(0, 10), clock: iso.slice(11, 16) };
}

function joinInstant(date, clock) {
  if (!date || !clock) return null;
  return new Date(`${date}T${clock}:00.000Z`).toISOString();
}

function toForm(entry) {
  if (!entry) return { ...EMPTY };
  const start = splitInstant(entry.start_time);
  const end = splitInstant(entry.end_time);
  return {
    title: entry.title ?? "",
    description: entry.description ?? "",
    location: entry.location ?? "",
    performer: entry.performer ?? "",
    genre: entry.genre ?? "",
    is_headliner: Boolean(entry.is_headliner),
    calendar_date_type: entry.calendar_date_type ?? "timed",
    calendar_status: entry.calendar_status ?? "confirmed",
    start_date: start.date, start_clock: start.clock,
    end_date: end.date, end_clock: end.clock,
    all_day_start: entry.all_day_start ? new Date(entry.all_day_start).toISOString().slice(0, 10) : "",
    all_day_end: entry.all_day_end ? new Date(entry.all_day_end).toISOString().slice(0, 10) : "",
    occurrence_id: entry.occurrence_id ?? "",
  };
}

function payloadFor(form) {
  const optional = (value) => (value.trim() ? value.trim() : null);
  return {
    title: form.title.trim(),
    description: optional(form.description),
    location: optional(form.location),
    performer: optional(form.performer),
    genre: optional(form.genre),
    is_headliner: form.is_headliner,
    calendar_date_type: form.calendar_date_type,
    calendar_status: form.calendar_status,
    start_time: form.calendar_date_type === "timed" ? joinInstant(form.start_date, form.start_clock) : null,
    end_time: form.calendar_date_type === "timed" ? joinInstant(form.end_date, form.end_clock) : null,
    all_day_start: form.calendar_date_type === "all_day" ? (form.all_day_start || null) : null,
    all_day_end: form.calendar_date_type === "all_day" ? (form.all_day_end || null) : null,
    occurrence_id: form.occurrence_id || null,
  };
}

function displayWhen(entry) {
  if (entry.calendar_date_type === "all_day") {
    const from = entry.all_day_start ? new Date(entry.all_day_start).toISOString().slice(0, 10) : "?";
    const to = entry.all_day_end ? new Date(entry.all_day_end).toISOString().slice(0, 10) : "?";
    return from === to ? `${from} · all day` : `${from} – ${to} · all day`;
  }
  if (!entry.start_time) return "Time TBD";
  const start = new Date(entry.start_time);
  const end = entry.end_time ? new Date(entry.end_time) : null;
  const day = start.toISOString().slice(0, 10);
  const clock = (value) => value.toISOString().slice(11, 16);
  return end ? `${day} · ${clock(start)}–${clock(end)}` : `${day} · ${clock(start)}`;
}

export default function AdminFestivalSchedule({ festivalId, initialSchedules, initialOccurrences }) {
  const router = useRouter();
  const [schedules, setSchedules] = useState(initialSchedules);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [state, setState] = useState({ pending: false, error: "" });

  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  function openFor(entry) {
    setEditing(entry);
    setForm(toForm(entry));
    setState({ pending: false, error: "" });
    setOpen(true);
  }

  async function submit(event) {
    event.preventDefault();
    setState({ pending: true, error: "" });
    const response = await fetch(
      editing
        ? `/api/admin/festivals/${festivalId}/schedules/${editing.id}`
        : `/api/admin/festivals/${festivalId}/schedules`,
      { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payloadFor(form)) },
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = result.issues?.map((issue) => issue.message).join(" ") || result.error;
      setState({ pending: false, error: detail || "The programme entry could not be saved." });
      return;
    }
    setOpen(false);
    setState({ pending: false, error: "" });
    setSchedules((current) => (editing
      ? current.map((entry) => (entry.id === result.schedule.id ? result.schedule : entry))
      : [...current, result.schedule]));
    router.refresh();
  }

  async function remove(entry) {
    setState({ pending: true, error: "" });
    const response = await fetch(`/api/admin/festivals/${festivalId}/schedules/${entry.id}`, { method: "DELETE" });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setState({ pending: false, error: result.error || "The programme entry could not be removed." });
      return;
    }
    setSchedules((current) => current.filter((item) => item.id !== entry.id));
    setState({ pending: false, error: "" });
    router.refresh();
  }

  const isTimed = form.calendar_date_type === "timed";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Programme</CardTitle>
          <p className="mt-1 text-sm text-slate-600">
            Performers, stages and set times. These appear on the public festival page under
            &ldquo;Schedule &amp; program&rdquo;.
          </p>
        </div>
        <Button type="button" onClick={() => openFor(null)}>
          <Plus className="mr-2 size-4" aria-hidden="true" />
          Add entry
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {state.error && (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        {schedules.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500">
            No programme entries yet. The public page hides this section until one exists.
          </p>
        )}

        <ul className="space-y-2">
          {schedules.map((entry) => (
            <li key={entry.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate font-medium text-slate-900">
                  {entry.is_headliner && <Star className="size-4 shrink-0 text-amber-500" aria-label="Headliner" />}
                  {entry.title}
                </p>
                <p className="truncate text-sm text-slate-500">
                  {displayWhen(entry)}
                  {entry.performer ? ` · ${entry.performer}` : ""}
                  {entry.location ? ` · ${entry.location}` : ""}
                </p>
              </div>
              <Badge variant={statusVariant[entry.calendar_status]}>{entry.calendar_status}</Badge>
              <div className="flex shrink-0 items-center gap-1">
                <Button type="button" variant="ghost" size="icon" onClick={() => openFor(entry)} aria-label={`Edit ${entry.title}`}>
                  <Pencil className="size-4" aria-hidden="true" />
                </Button>
                <Button type="button" variant="ghost" size="icon" disabled={state.pending} onClick={() => remove(entry)} aria-label={`Remove ${entry.title}`}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit programme entry" : "Add programme entry"}</DialogTitle>
            <DialogDescription>
              Times are Philadelphia local. A timed entry needs both a start and an end, or it
              will not appear in calendar exports.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sched-title">Title</Label>
              <Input id="sched-title" value={form.title} maxLength={200} required onChange={(event) => update("title", event.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sched-performer">Performer</Label>
                <Input id="sched-performer" value={form.performer} maxLength={200} onChange={(event) => update("performer", event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sched-genre">Genre</Label>
                <Input id="sched-genre" value={form.genre} maxLength={120} onChange={(event) => update("genre", event.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sched-location">Stage or location</Label>
              <Input id="sched-location" value={form.location} maxLength={300} onChange={(event) => update("location", event.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sched-type">Timing</Label>
              <select
                id="sched-type"
                value={form.calendar_date_type}
                onChange={(event) => update("calendar_date_type", event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="timed">Specific times</option>
                <option value="all_day">All day</option>
              </select>
            </div>

            {isTimed ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sched-start-date">Start date</Label>
                  <Input id="sched-start-date" type="date" value={form.start_date} required onChange={(event) => update("start_date", event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sched-start-clock">Start time</Label>
                  <Input id="sched-start-clock" type="time" value={form.start_clock} required onChange={(event) => update("start_clock", event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sched-end-date">End date</Label>
                  <Input id="sched-end-date" type="date" value={form.end_date} required onChange={(event) => update("end_date", event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sched-end-clock">End time</Label>
                  <Input id="sched-end-clock" type="time" value={form.end_clock} required onChange={(event) => update("end_clock", event.target.value)} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sched-all-day-start">First day</Label>
                  <Input id="sched-all-day-start" type="date" value={form.all_day_start} required onChange={(event) => update("all_day_start", event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sched-all-day-end">Last day</Label>
                  <Input id="sched-all-day-end" type="date" value={form.all_day_end} required onChange={(event) => update("all_day_end", event.target.value)} />
                </div>
              </div>
            )}

            {initialOccurrences?.length > 1 && (
              <div className="space-y-1.5">
                <Label htmlFor="sched-occurrence">Occurrence</Label>
                <select
                  id="sched-occurrence"
                  value={form.occurrence_id}
                  onChange={(event) => update("occurrence_id", event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Not tied to a specific occurrence</option>
                  {initialOccurrences.map((occurrence) => (
                    <option key={occurrence.id} value={occurrence.id}>
                      {occurrence.is_primary ? "Primary · " : ""}
                      {occurrence.start_at ? new Date(occurrence.start_at).toISOString().slice(0, 10) : "undated"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="sched-status">Status</Label>
              <select
                id="sched-status"
                value={form.calendar_status}
                onChange={(event) => update("calendar_status", event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sched-description">Description</Label>
              <textarea
                id="sched-description"
                value={form.description}
                maxLength={2000}
                rows={3}
                onChange={(event) => update("description", event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-start gap-2">
              <input
                id="sched-headliner"
                type="checkbox"
                checked={form.is_headliner}
                onChange={(event) => update("is_headliner", event.target.checked)}
                className="mt-1 size-4 rounded border-slate-300"
              />
              <Label htmlFor="sched-headliner" className="text-sm font-normal text-slate-700">
                Headliner
              </Label>
            </div>

            {state.error && (
              <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {state.error}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={state.pending}>{state.pending ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
