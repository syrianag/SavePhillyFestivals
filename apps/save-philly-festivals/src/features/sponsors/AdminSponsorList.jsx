"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Pencil, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SLOTS = [
  { value: "left_rail", label: "Left rail", hint: "Desktop only (≥1536px); moves into the footer on smaller screens" },
  { value: "right_rail", label: "Right rail", hint: "Desktop only (≥1536px); moves into the footer on smaller screens" },
  { value: "footer", label: "Footer band", hint: "Shown on every public page at every width" },
];
const STATUSES = ["draft", "active", "archived"];

const EMPTY = {
  name: "", slot: "footer", status: "draft", sort_order: 0,
  href: "", alt_text: "", image_url: "", image_width: "", image_height: "",
  pill_color: "", text_color: "", starts_at: "", ends_at: "",
};

function toForm(sponsor) {
  if (!sponsor) return { ...EMPTY };
  return {
    name: sponsor.name ?? "",
    slot: sponsor.slot,
    status: sponsor.status,
    sort_order: sponsor.sort_order ?? 0,
    href: sponsor.href ?? "",
    alt_text: sponsor.alt_text ?? "",
    image_url: sponsor.image_url ?? "",
    image_width: sponsor.image_width ?? "",
    image_height: sponsor.image_height ?? "",
    pill_color: sponsor.pill_color ?? "",
    text_color: sponsor.text_color ?? "",
    starts_at: sponsor.starts_at ? new Date(sponsor.starts_at).toISOString().slice(0, 10) : "",
    ends_at: sponsor.ends_at ? new Date(sponsor.ends_at).toISOString().slice(0, 10) : "",
  };
}

const statusVariant = { active: "default", draft: "secondary", archived: "outline" };

export default function AdminSponsorList({ initialSponsors }) {
  const router = useRouter();
  const [sponsors, setSponsors] = useState(initialSponsors);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [status, setStatus] = useState({ pending: false, error: "" });

  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  function openFor(sponsor) {
    setEditing(sponsor);
    setForm(toForm(sponsor));
    setStatus({ pending: false, error: "" });
    setOpen(true);
  }

  function payloadFrom(values) {
    const optionalText = (value) => (value.trim() ? value.trim() : null);
    const optionalNumber = (value) => (value === "" ? null : Number(value));
    return {
      name: values.name.trim(),
      slot: values.slot,
      status: values.status,
      sort_order: Number(values.sort_order) || 0,
      href: optionalText(values.href),
      alt_text: optionalText(values.alt_text),
      image_url: optionalText(values.image_url),
      image_width: optionalNumber(values.image_width),
      image_height: optionalNumber(values.image_height),
      pill_color: optionalText(values.pill_color),
      text_color: optionalText(values.text_color),
      starts_at: values.starts_at ? new Date(`${values.starts_at}T00:00:00.000Z`).toISOString() : null,
      ends_at: values.ends_at ? new Date(`${values.ends_at}T00:00:00.000Z`).toISOString() : null,
    };
  }

  async function send(url, method, body) {
    const response = await fetch(url, {
      method,
      ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}),
    });
    const parsed = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(parsed?.issues?.length
        ? parsed.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")
        : parsed?.error || "The sponsor could not be saved.");
    }
    return parsed;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ pending: true, error: "" });
    try {
      const body = payloadFrom(form);
      const result = editing
        ? await send(`/api/admin/sponsors/${encodeURIComponent(editing.id)}`, "PATCH", body)
        : await send("/api/admin/sponsors", "POST", body);
      setSponsors((current) => (editing
        ? current.map((item) => (item.id === result.sponsor.id ? result.sponsor : item))
        : [...current, result.sponsor]));
      setOpen(false);
      router.refresh();
    } catch (error) {
      setStatus({ pending: false, error: error.message });
      return;
    }
    setStatus({ pending: false, error: "" });
  }

  async function handleArchive(sponsor) {
    try {
      const result = await send(`/api/admin/sponsors/${encodeURIComponent(sponsor.id)}`, "DELETE");
      setSponsors((current) => current.map((item) => (item.id === result.sponsor.id ? result.sponsor : item)));
      router.refresh();
    } catch (error) {
      setStatus({ pending: false, error: error.message });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900">Sponsors</h1>
          <p className="mt-1 text-sm text-slate-500">
            Placements appear on the public site without a redeploy. Creatives are referenced by
            https URL — upload the image to your own host, then paste the link here.
          </p>
        </div>
        <Button type="button" onClick={() => openFor(null)}>
          <Plus className="size-4" aria-hidden="true" />
          Add sponsor
        </Button>
      </div>

      {status.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{status.error}</p>
      )}

      {SLOTS.map((slotDef) => {
        const rows = sponsors.filter((sponsor) => sponsor.slot === slotDef.value);
        return (
          <Card key={slotDef.value} className="border-slate-200 bg-white shadow-xs">
            <CardHeader>
              <CardTitle className="font-heading">{slotDef.label}</CardTitle>
              <p className="text-sm text-slate-500">{slotDef.hint}</p>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No sponsors in this slot. The slot renders nothing at all rather than an empty box.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-3xl text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                        <th scope="col" className="py-2 pr-3">Order</th>
                        <th scope="col" className="py-2 pr-3">Name</th>
                        <th scope="col" className="py-2 pr-3">Status</th>
                        <th scope="col" className="py-2 pr-3">Creative</th>
                        <th scope="col" className="py-2 pr-3">Runs</th>
                        <th scope="col" className="py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((sponsor) => (
                        <tr key={sponsor.id} className="border-b border-slate-100">
                          <td className="py-2 pr-3 text-slate-500">{sponsor.sort_order}</td>
                          <td className="py-2 pr-3 font-semibold text-slate-900">{sponsor.name}</td>
                          <td className="py-2 pr-3">
                            <Badge variant={statusVariant[sponsor.status]}>{sponsor.status}</Badge>
                          </td>
                          <td className="py-2 pr-3 text-slate-500">{sponsor.image_url ? "Image" : "Name pill"}</td>
                          <td className="py-2 pr-3 text-slate-500">
                            {sponsor.starts_at || sponsor.ends_at
                              ? `${sponsor.starts_at ? new Date(sponsor.starts_at).toISOString().slice(0, 10) : "—"} → ${sponsor.ends_at ? new Date(sponsor.ends_at).toISOString().slice(0, 10) : "—"}`
                              : "Always"}
                          </td>
                          <td className="py-2">
                            <div className="flex gap-2">
                              <Button type="button" variant="outline" size="sm" onClick={() => openFor(sponsor)}>
                                <Pencil className="size-3.5" aria-hidden="true" />
                                Edit
                              </Button>
                              {sponsor.status !== "archived" && (
                                <Button type="button" variant="outline" size="sm" onClick={() => handleArchive(sponsor)}>
                                  <Archive className="size-3.5" aria-hidden="true" />
                                  Archive
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="font-heading">{editing ? "Edit sponsor" : "Add sponsor"}</DialogTitle>
              <DialogDescription>
                Supply either a creative image URL or a pill color — a sponsor with neither would
                occupy a slot and draw nothing.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="sponsor-name">Sponsor name</Label>
                <Input id="sponsor-name" value={form.name} required maxLength={200} onChange={(e) => update("name", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="sponsor-slot">Slot</Label>
                <select
                  id="sponsor-slot"
                  className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm"
                  value={form.slot}
                  onChange={(e) => update("slot", e.target.value)}
                >
                  {SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="sponsor-status">Status</Label>
                <select
                  id="sponsor-status"
                  className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm"
                  value={form.status}
                  onChange={(e) => update("status", e.target.value)}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="sponsor-order">Display order</Label>
                <Input id="sponsor-order" type="number" min={0} max={9999} value={form.sort_order} onChange={(e) => update("sort_order", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="sponsor-href">Link URL (https)</Label>
                <Input id="sponsor-href" type="url" value={form.href} onChange={(e) => update("href", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="sponsor-image">Creative image URL (https)</Label>
                <Input id="sponsor-image" type="url" value={form.image_url} onChange={(e) => update("image_url", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="sponsor-width">Image width</Label>
                <Input id="sponsor-width" type="number" min={1} max={4000} value={form.image_width} onChange={(e) => update("image_width", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="sponsor-height">Image height</Label>
                <Input id="sponsor-height" type="number" min={1} max={4000} value={form.image_height} onChange={(e) => update("image_height", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="sponsor-alt">Alt text</Label>
                <Input id="sponsor-alt" value={form.alt_text} maxLength={500} onChange={(e) => update("alt_text", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="sponsor-pill">Pill background (#rrggbb)</Label>
                <Input id="sponsor-pill" value={form.pill_color} placeholder="#e0f2fe" onChange={(e) => update("pill_color", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="sponsor-text">Pill text color (#rrggbb)</Label>
                <Input id="sponsor-text" value={form.text_color} placeholder="#0369a1" onChange={(e) => update("text_color", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="sponsor-starts">Starts on</Label>
                <Input id="sponsor-starts" type="date" value={form.starts_at} onChange={(e) => update("starts_at", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="sponsor-ends">Ends on</Label>
                <Input id="sponsor-ends" type="date" value={form.ends_at} onChange={(e) => update("ends_at", e.target.value)} />
              </div>
            </div>

            {status.error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{status.error}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={status.pending}>{status.pending ? "Saving…" : "Save sponsor"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
