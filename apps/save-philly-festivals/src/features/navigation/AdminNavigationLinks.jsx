"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PLACEMENTS = [
  { value: "header", label: "Header menu", hint: "The main navigation bar on every public page" },
  { value: "footer", label: "Footer", hint: "Grouped into titled columns at the bottom of the page" },
];

const EMPTY = { placement: "header", section: "", label: "", href: "", visible: true };

function toForm(link) {
  if (!link) return { ...EMPTY };
  return {
    placement: link.placement,
    section: link.section ?? "",
    label: link.label ?? "",
    href: link.href ?? "",
    visible: link.visible !== false,
  };
}

/* Only changed keys are sent on edit, so an untouched field cannot overwrite a value another
 * admin changed in the meantime. Creation sends the full payload. */
function payloadFor(form, editing) {
  const next = {
    placement: form.placement,
    section: form.placement === "footer" ? (form.section.trim() || null) : null,
    label: form.label.trim(),
    href: form.href.trim(),
    visible: form.visible,
  };
  if (!editing) return next;
  const changed = {};
  for (const [key, value] of Object.entries(next)) {
    const before = key === "section" ? (editing.section ?? null) : editing[key];
    if (value !== before) changed[key] = value;
  }
  return changed;
}

export default function AdminNavigationLinks({ initialLinks }) {
  const router = useRouter();
  const [links, setLinks] = useState(initialLinks);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [state, setState] = useState({ pending: false, error: "" });
  const [dragId, setDragId] = useState(null);

  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  function openFor(link) {
    setEditing(link);
    setForm(toForm(link));
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
      editing ? `/api/admin/navigation/${editing.id}` : "/api/admin/navigation",
      { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = result.issues?.map((issue) => issue.message).join(" ") || result.error;
      setState({ pending: false, error: detail || "The link could not be saved." });
      return;
    }
    setOpen(false);
    setState({ pending: false, error: "" });
    router.refresh();
  }

  async function remove(link) {
    setState({ pending: true, error: "" });
    const response = await fetch(`/api/admin/navigation/${link.id}`, { method: "DELETE" });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setState({ pending: false, error: result.error || "The link could not be removed." });
      return;
    }
    setState({ pending: false, error: "" });
    router.refresh();
  }

  /* Persists the whole visible ordering. Optimistic so dragging stays responsive; a failed save
   * restores the server's order rather than leaving a menu nobody chose on screen. */
  async function persistOrder(next) {
    const previous = links;
    setLinks(next);
    setState({ pending: true, error: "" });
    const response = await fetch("/api/admin/navigation/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: next.map((link) => link.id) }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setLinks(previous);
      setState({ pending: false, error: result.error || "The new order could not be saved." });
      return;
    }
    setState({ pending: false, error: "" });
    router.refresh();
  }

  function move(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= links.length) return;
    const next = [...links];
    [next[index], next[target]] = [next[target], next[index]];
    persistOrder(next);
  }

  function onDrop(targetId) {
    if (!dragId || dragId === targetId) return;
    const from = links.findIndex((link) => link.id === dragId);
    const to = links.findIndex((link) => link.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...links];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDragId(null);
    persistOrder(next);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Public navigation</CardTitle>
          <p className="mt-1 text-sm text-slate-600">
            The header menu and footer links on every public page. Drag to reorder, or use the
            arrow buttons. Admin and producer portal links cannot be added here.
          </p>
        </div>
        <Button type="button" onClick={() => openFor(null)}>
          <Plus className="mr-2 size-4" aria-hidden="true" />
          Add link
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {state.error && (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        {links.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">
            No links yet. The public site is showing its built-in menu.
          </p>
        )}

        <ol className="space-y-2">
          {links.map((link, index) => (
            <li
              key={link.id}
              draggable
              onDragStart={() => setDragId(link.id)}
              onDragEnd={() => setDragId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => onDrop(link.id)}
              className={`flex items-center gap-3 rounded-lg border p-3 ${dragId === link.id ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white"}`}
            >
              <GripVertical className="size-4 shrink-0 cursor-grab text-slate-400" aria-hidden="true" />

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">{link.label}</p>
                <p className="truncate text-sm text-slate-500">
                  {link.href}
                  {link.section ? ` · ${link.section}` : ""}
                </p>
              </div>

              <Badge variant="outline">{link.placement}</Badge>
              {!link.visible && <Badge variant="secondary">hidden</Badge>}

              <div className="flex shrink-0 items-center gap-1">
                {/* Keyboard-operable equivalent of the drag handle: reordering a menu must not be
                  * mouse-only. */}
                <Button type="button" variant="ghost" size="icon" disabled={index === 0 || state.pending} onClick={() => move(index, -1)} aria-label={`Move ${link.label} up`}>
                  <ChevronUp className="size-4" aria-hidden="true" />
                </Button>
                <Button type="button" variant="ghost" size="icon" disabled={index === links.length - 1 || state.pending} onClick={() => move(index, 1)} aria-label={`Move ${link.label} down`}>
                  <ChevronDown className="size-4" aria-hidden="true" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => openFor(link)} aria-label={`Edit ${link.label}`}>
                  <Pencil className="size-4" aria-hidden="true" />
                </Button>
                <Button type="button" variant="ghost" size="icon" disabled={state.pending} onClick={() => remove(link)} aria-label={`Remove ${link.label}`}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit link" : "Add link"}</DialogTitle>
            <DialogDescription>
              Changes appear on the public site immediately.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nav-placement">Where it appears</Label>
              <select
                id="nav-placement"
                value={form.placement}
                onChange={(event) => update("placement", event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {PLACEMENTS.map((placement) => (
                  <option key={placement.value} value={placement.value}>{placement.label}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                {PLACEMENTS.find((placement) => placement.value === form.placement)?.hint}
              </p>
            </div>

            {form.placement === "footer" && (
              <div className="space-y-1.5">
                <Label htmlFor="nav-section">Footer column</Label>
                <Input id="nav-section" value={form.section} maxLength={80} placeholder="Explore" onChange={(event) => update("section", event.target.value)} />
                <p className="text-xs text-slate-500">Links sharing a column title are grouped together. Blank goes under &ldquo;More&rdquo;.</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="nav-label">Label</Label>
              <Input id="nav-label" value={form.label} maxLength={80} required onChange={(event) => update("label", event.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nav-href">Destination</Label>
              <Input id="nav-href" value={form.href} maxLength={2000} required placeholder="/about or https://…" onChange={(event) => update("href", event.target.value)} />
              <p className="text-xs text-slate-500">
                A path on this site starting with <code>/</code>, or a full <code>https://</code> address.
              </p>
            </div>

            <div className="flex items-start gap-2">
              <input
                id="nav-visible"
                type="checkbox"
                checked={form.visible}
                onChange={(event) => update("visible", event.target.checked)}
                className="mt-1 size-4 rounded border-slate-300"
              />
              <Label htmlFor="nav-visible" className="text-sm font-normal text-slate-700">
                Show this link on the public site
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
