"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TEMPLATE_TOKENS, renderTemplate, unknownTokens } from "@/features/producer-access/email-template-service";

const PREVIEW_VALUES = {
  name: "Monica Montgomery",
  email: "monica@example.org",
  site_url: "https://savephillyfestivals.com",
  producer_url: "https://savephillyfestivals.com/producer/dashboard",
  reason: "We couldn't verify the organization listed on the request.",
};

export default function AdminEmailTemplates({ initialTemplates }) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", subject: "", body: "", description: "", enabled: true });
  const [status, setStatus] = useState({ pending: false, error: "" });

  function open(template) {
    setEditing(template);
    setForm({
      name: template.name,
      subject: template.subject,
      body: template.body,
      description: template.description || "",
      enabled: template.enabled,
    });
    setStatus({ pending: false, error: "" });
  }

  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  async function submit(event) {
    event.preventDefault();
    setStatus({ pending: true, error: "" });
    try {
      const response = await fetch(`/api/admin/email-templates/${encodeURIComponent(editing.key)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          subject: form.subject.trim(),
          body: form.body.trim(),
          description: form.description.trim() || null,
          enabled: form.enabled,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus({
          pending: false,
          error: body?.issues?.length ? body.issues.map((i) => `${i.path}: ${i.message}`).join("; ") : body?.error || "The template could not be saved.",
        });
        return;
      }
      setTemplates((current) => current.map((item) => (item.key === body.template.key ? body.template : item)));
      setEditing(null);
      router.refresh();
    } catch {
      setStatus({ pending: false, error: "The template could not be saved." });
    }
    setStatus({ pending: false, error: "" });
  }

  const allowedTokens = editing ? TEMPLATE_TOKENS[editing.key] || [] : [];
  /* Surfaced before saving: a mistyped token renders as empty text in a real email, which is
   * invisible here but obvious to the recipient. */
  const badTokens = editing ? unknownTokens(`${form.subject} ${form.body}`, editing.key) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-slate-900">Email templates</h1>
        <p className="mt-1 text-sm text-slate-500">
          Wording sent to applicants. Changes take effect immediately — no deploy needed.
          Use <code className="rounded bg-slate-100 px-1">{"{{token}}"}</code> placeholders to insert details.
        </p>
      </div>

      {templates.map((template) => (
        <Card key={template.key} className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="font-heading">{template.name}</CardTitle>
              {template.description && <p className="mt-1 text-sm text-slate-500">{template.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={template.enabled ? "default" : "outline"}>{template.enabled ? "Enabled" : "Disabled"}</Badge>
              <Button type="button" variant="outline" size="sm" onClick={() => open(template)}>
                <Pencil className="size-3.5" aria-hidden="true" /> Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold text-slate-700">Subject: {template.subject}</p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-body text-sm text-slate-600">{template.body}</pre>
          </CardContent>
        </Card>
      ))}

      <Dialog open={Boolean(editing)} onOpenChange={(next) => !next && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {editing && (
            <form onSubmit={submit}>
              <DialogHeader>
                <DialogTitle className="font-heading">Edit &ldquo;{editing.name}&rdquo;</DialogTitle>
                <DialogDescription>
                  Available placeholders: {allowedTokens.map((token) => `{{${token}}}`).join(", ") || "none"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="template-name">Template name</Label>
                  <Input id="template-name" value={form.name} required maxLength={120} onChange={(e) => update("name", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="template-subject">Subject line</Label>
                  <Input id="template-subject" value={form.subject} required maxLength={200} onChange={(e) => update("subject", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="template-body">Message</Label>
                  <textarea id="template-body" value={form.body} required maxLength={20000}
                    className="w-full min-h-64 rounded-lg border border-slate-200 p-2.5 font-body text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    onChange={(e) => update("body", e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <input id="template-enabled" type="checkbox" className="size-4 rounded border-slate-300"
                    checked={form.enabled} onChange={(e) => update("enabled", e.target.checked)} />
                  <Label htmlFor="template-enabled">Send this email</Label>
                </div>

                {badTokens.length > 0 && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Unrecognised placeholder{badTokens.length > 1 ? "s" : ""}: {badTokens.map((t) => `{{${t}}}`).join(", ")}.
                    These render as empty text.
                  </p>
                )}

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Preview</p>
                  <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-900">{renderTemplate(form.subject, PREVIEW_VALUES)}</p>
                    <pre className="mt-2 whitespace-pre-wrap font-body text-sm text-slate-600">{renderTemplate(form.body, PREVIEW_VALUES)}</pre>
                  </div>
                </div>
              </div>

              {status.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{status.error}</p>}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button type="submit" disabled={status.pending}>{status.pending ? "Saving…" : "Save template"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
