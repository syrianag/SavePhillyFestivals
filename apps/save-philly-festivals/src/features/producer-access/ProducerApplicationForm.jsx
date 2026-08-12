"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMPTY = {
  name: "", email: "", password: "",
  organization: "", bio: "", contact_phone: "",
  festival_name: "", festival_description: "", festival_location: "",
  festival_city: "", festival_zip_code: "", festival_website_url: "",
  festival_start_date: "", festival_end_date: "",
  representation_acknowledged: false,
  accuracy_acknowledged: false,
  terms_acknowledged: false,
};

/* A date input yields `YYYY-MM-DD`; the API takes an ISO datetime. Converted at the boundary so
 * the schema can stay strict rather than accepting both shapes. */
function toIsoDate(value) {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function payloadFor(form) {
  const optional = (value) => (value.trim() ? value.trim() : undefined);
  return {
    name: form.name.trim(),
    email: form.email.trim(),
    password: form.password,
    organization: optional(form.organization),
    bio: optional(form.bio),
    contact_phone: optional(form.contact_phone),
    festival_name: form.festival_name.trim(),
    festival_description: optional(form.festival_description),
    festival_location: optional(form.festival_location),
    festival_city: optional(form.festival_city),
    festival_zip_code: optional(form.festival_zip_code),
    festival_website_url: optional(form.festival_website_url),
    festival_start_date: toIsoDate(form.festival_start_date),
    festival_end_date: toIsoDate(form.festival_end_date),
    representation_acknowledged: form.representation_acknowledged,
    accuracy_acknowledged: form.accuracy_acknowledged,
    terms_acknowledged: form.terms_acknowledged,
  };
}

export default function ProducerApplicationForm() {
  const [form, setForm] = useState({ ...EMPTY });
  const [state, setState] = useState({ pending: false, error: "", done: false });

  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  async function submit(event) {
    event.preventDefault();
    setState({ pending: true, error: "", done: false });

    const response = await fetch("/api/producer/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadFor(form)),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const detail = result.issues?.map((issue) => issue.message).join(" ") || result.error;
      setState({ pending: false, error: detail || "Your application could not be submitted.", done: false });
      return;
    }
    setState({ pending: false, error: "", done: true });
  }

  /* Deliberately identical whether or not an account already existed for this address —
   * a different message here would leak which emails are registered. */
  if (state.done) {
    return (
      <Card>
        <CardHeader><CardTitle>Application received</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-slate-700">
          <p>
            Thanks — the Philly Festivals team will review your application and your event, and
            email you at <strong>{form.email}</strong> once a decision is made.
          </p>
          <p className="text-sm text-slate-500">
            Your event stays private until it has been reviewed and published.
          </p>
          <Link href="/" className="inline-block font-ui text-sm font-bold text-indigo-700 hover:underline">
            Back to festivals
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>About you</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="apply-name">Your name</Label>
            <Input id="apply-name" value={form.name} maxLength={120} required onChange={(event) => update("name", event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apply-email">Email</Label>
            <Input id="apply-email" type="email" value={form.email} maxLength={320} required autoComplete="email" onChange={(event) => update("email", event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apply-password">Password</Label>
            <Input id="apply-password" type="password" value={form.password} minLength={12} maxLength={72} required autoComplete="new-password" onChange={(event) => update("password", event.target.value)} />
            <p className="text-xs text-slate-500">At least 12 characters. Length matters more than symbols.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apply-organization">Organization (optional)</Label>
            <Input id="apply-organization" value={form.organization} maxLength={200} onChange={(event) => update("organization", event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apply-phone">Contact phone (optional)</Label>
            <Input id="apply-phone" value={form.contact_phone} maxLength={50} onChange={(event) => update("contact_phone", event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apply-bio">Short bio (optional)</Label>
            <textarea id="apply-bio" value={form.bio} maxLength={2000} rows={3} onChange={(event) => update("bio", event.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Your event</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="apply-festival-name">Festival name</Label>
            <Input id="apply-festival-name" value={form.festival_name} maxLength={200} required onChange={(event) => update("festival_name", event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apply-festival-description">Description (optional)</Label>
            <textarea id="apply-festival-description" value={form.festival_description} maxLength={5000} rows={4} onChange={(event) => update("festival_description", event.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apply-festival-location">Location / address (optional)</Label>
            <Input id="apply-festival-location" value={form.festival_location} maxLength={300} onChange={(event) => update("festival_location", event.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="apply-festival-city">City (optional)</Label>
              <Input id="apply-festival-city" value={form.festival_city} maxLength={120} onChange={(event) => update("festival_city", event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apply-festival-zip">ZIP code (optional)</Label>
              <Input id="apply-festival-zip" value={form.festival_zip_code} maxLength={20} onChange={(event) => update("festival_zip_code", event.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="apply-festival-start">Start date (optional)</Label>
              <Input id="apply-festival-start" type="date" value={form.festival_start_date} onChange={(event) => update("festival_start_date", event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apply-festival-end">End date (optional)</Label>
              <Input id="apply-festival-end" type="date" value={form.festival_end_date} onChange={(event) => update("festival_end_date", event.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apply-festival-website">Website (optional)</Label>
            <Input id="apply-festival-website" value={form.festival_website_url} maxLength={2000} placeholder="https://" onChange={(event) => update("festival_website_url", event.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Confirm</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[
            ["representation_acknowledged", "I am authorized to represent this festival."],
            ["accuracy_acknowledged", "The information I have provided is accurate to the best of my knowledge."],
            ["terms_acknowledged", "I agree to the terms of use and privacy policy."],
          ].map(([key, label]) => (
            <div key={key} className="flex items-start gap-2">
              <input
                id={`apply-${key}`}
                type="checkbox"
                required
                checked={form[key]}
                onChange={(event) => update(key, event.target.checked)}
                className="mt-1 size-4 rounded border-slate-300"
              />
              <Label htmlFor={`apply-${key}`} className="text-sm font-normal text-slate-700">{label}</Label>
            </div>
          ))}
        </CardContent>
      </Card>

      {state.error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={state.pending} className="w-full sm:w-auto">
        {state.pending ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  );
}
