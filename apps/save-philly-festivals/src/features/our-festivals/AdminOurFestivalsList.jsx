"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ChevronDown, ChevronUp, GripVertical, Pencil, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OUR_FESTIVALS_IMAGE_GUIDANCE } from "./our-festivals-schema";

const STATUSES = ["draft", "published", "archived"];
const statusVariant = { published: "default", draft: "secondary", archived: "outline" };

const EMPTY = {
  title: "", caption: "", festival_id: "", image_url: "",
  image_width: "", image_height: "", alt_text: "", status: "draft",
};

function toForm(item) {
  if (!item) return { ...EMPTY };
  return {
    title: item.title ?? "",
    caption: item.caption ?? "",
    festival_id: item.festival_id ?? "",
    image_url: item.image_url ?? "",
    image_width: item.image_width ?? "",
    image_height: item.image_height ?? "",
    alt_text: item.alt_text ?? "",
    status: item.status,
  };
}

/* Only changed keys are sent on edit, so an untouched field can never overwrite a value another
 * curator changed in the meantime. Creation sends the full payload. */
function payloadFor(form, editing) {
  const next = {
    title: form.title.trim(),
    caption: form.caption.trim() || null,
    festival_id: form.festival_id.trim() || null,
    image_url: form.image_url.trim(),
    image_width: form.image_width === "" ? null : Number(form.image_width),
    image_height: form.image_height === "" ? null : Number(form.image_height),
    alt_text: form.alt_text.trim(),
    status: form.status,
  };
  if (!editing) return next;
  const changed = {};
  for (const [key, value] of Object.entries(next)) {
    const before = key === "image_width" || key === "image_height"
      ? (editing[key] ?? null)
      : (editing[key] ?? (typeof value === "string" ? "" : null));
    if (value !== before) changed[key] = value;
  }
  return changed;
}

export default function AdminOurFestivalsList({ initialItems }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [state, setState] = useState({ pending: false, error: "" });
  const [dragId, setDragId] = useState(null);

  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  function openFor(item) {
    setEditing(item);
    setForm(toForm(item));
    setState({ pending: false, error: "" });
    setOpen(true);
  }

  async function submit(event) {
    event.preventDefault();
    setState({ pending: true, error: "" });
    const body = payloadFor(form, editing);
    if (editing && Object.keys(body).length === 0) {
      setOpen(false);
      setState({ pending: false, error: "" });
      return;
    }
    const response = await fetch(
      editing ? `/api/admin/our-festivals/${editing.id}` : "/api/admin/our-festivals",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = result.issues?.map((issue) => issue.message).join(" ") || result.error;
      setState({ pending: false, error: detail || "The gallery item could not be saved." });
      return;
    }
    setOpen(false);
    setState({ pending: false, error: "" });
    router.refresh();
  }

  async function archive(item) {
    setState({ pending: true, error: "" });
    const response = await fetch(`/api/admin/our-festivals/${item.id}`, { method: "DELETE" });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setState({ pending: false, error: result.error || "The gallery item could not be archived." });
      return;
    }
    setState({ pending: false, error: "" });
    router.refresh();
  }

  /* Persists the whole visible ordering. Optimistic locally so dragging stays responsive; a
   * failed save restores the server's ordering via `router.refresh()` rather than leaving the
   * list showing an order that was never written. */
  async function persistOrder(next) {
    const previous = items;
    setItems(next);
    setState({ pending: true, error: "" });
    const response = await fetch("/api/admin/our-festivals/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: next.map((item) => item.id) }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setItems(previous);
      setState({ pending: false, error: result.error || "The new order could not be saved." });
      return;
    }
    setState({ pending: false, error: "" });
    router.refresh();
  }

  function move(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    persistOrder(next);
  }

  function onDrop(targetId) {
    if (!dragId || dragId === targetId) return;
    const from = items.findIndex((item) => item.id === dragId);
    const to = items.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDragId(null);
    persistOrder(next);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Our Festivals gallery</CardTitle>
          <p className="mt-1 text-sm text-slate-600">
            Curated imagery for the public gallery. Drag to reorder, or use the arrow buttons.
          </p>
        </div>
        <Button type="button" onClick={() => openFor(null)}>
          <Plus className="mr-2 size-4" aria-hidden="true" />
          Add item
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {state.error && (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        {items.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">
            No gallery items yet. Add one to start building the Our Festivals page.
          </p>
        )}

        <ol className="space-y-2">
          {items.map((item, index) => (
            <li
              key={item.id}
              draggable
              onDragStart={() => setDragId(item.id)}
              onDragEnd={() => setDragId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => onDrop(item.id)}
              className={`flex items-center gap-3 rounded-lg border p-3 ${dragId === item.id ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white"}`}
            >
              <GripVertical className="size-4 shrink-0 cursor-grab text-slate-400" aria-hidden="true" />

              {/* Curator-supplied artwork from arbitrary https origins, so next/image would need
                * every host allowlisted. A plain img keeps the CSP as the only gate. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image_url}
                alt={item.alt_text}
                className="h-12 w-18 shrink-0 rounded object-cover"
                width={72}
                height={48}
              />

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">{item.title}</p>
                <p className="truncate text-sm text-slate-500">
                  {item.caption || "No caption"}
                  {item.festival ? ` · linked to ${item.festival.name}` : ""}
                </p>
              </div>

              <Badge variant={statusVariant[item.status]}>{item.status}</Badge>

              <div className="flex shrink-0 items-center gap-1">
                {/* Keyboard-operable equivalent of the drag handle: reordering must not be
                  * mouse-only, and this is the whole point of the feature for the curator. */}
                <Button type="button" variant="ghost" size="icon" disabled={index === 0 || state.pending} onClick={() => move(index, -1)} aria-label={`Move ${item.title} up`}>
                  <ChevronUp className="size-4" aria-hidden="true" />
                </Button>
                <Button type="button" variant="ghost" size="icon" disabled={index === items.length - 1 || state.pending} onClick={() => move(index, 1)} aria-label={`Move ${item.title} down`}>
                  <ChevronDown className="size-4" aria-hidden="true" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => openFor(item)} aria-label={`Edit ${item.title}`}>
                  <Pencil className="size-4" aria-hidden="true" />
                </Button>
                <Button type="button" variant="ghost" size="icon" disabled={item.status === "archived" || state.pending} onClick={() => archive(item)} aria-label={`Archive ${item.title}`}>
                  <Archive className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit gallery item" : "Add gallery item"}</DialogTitle>
            <DialogDescription>{OUR_FESTIVALS_IMAGE_GUIDANCE.displayHint}</DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="our-festival-title">Title</Label>
              <Input id="our-festival-title" value={form.title} maxLength={200} required onChange={(event) => update("title", event.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="our-festival-caption">Caption</Label>
              <textarea
                id="our-festival-caption"
                value={form.caption}
                maxLength={2000}
                rows={3}
                onChange={(event) => update("caption", event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="our-festival-image">Image URL</Label>
              <Input
                id="our-festival-image"
                value={form.image_url}
                maxLength={2000}
                required
                placeholder="https://… or /api/public/assets/…"
                onChange={(event) => update("image_url", event.target.value)}
              />
              <p className="text-xs text-slate-500">{OUR_FESTIVALS_IMAGE_GUIDANCE.displayHint}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="our-festival-alt">Alt text</Label>
              <Input id="our-festival-alt" value={form.alt_text} maxLength={500} required onChange={(event) => update("alt_text", event.target.value)} />
              <p className="text-xs text-slate-500">Describe the image for visitors using a screen reader.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="our-festival-width">Image width (px)</Label>
                <Input id="our-festival-width" type="number" min={1} max={10000} value={form.image_width} onChange={(event) => update("image_width", event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="our-festival-height">Image height (px)</Label>
                <Input id="our-festival-height" type="number" min={1} max={10000} value={form.image_height} onChange={(event) => update("image_height", event.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="our-festival-festival">Linked festival ID (optional)</Label>
              <Input id="our-festival-festival" value={form.festival_id} placeholder="UUID" onChange={(event) => update("festival_id", event.target.value)} />
              <p className="text-xs text-slate-500">The public link only appears once that festival is published.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="our-festival-status">Status</Label>
              <select
                id="our-festival-status"
                value={form.status}
                onChange={(event) => update("status", event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <p className="text-xs text-slate-500">Only <strong>published</strong> items appear on the public gallery.</p>
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
