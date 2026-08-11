"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ pending: false, sent: false, error: "" });

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ pending: true, sent: false, error: "" });

    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setStatus({
          pending: false,
          sent: false,
          error: body?.issues?.length
            ? body.issues.map((issue) => issue.message).join("; ")
            : body?.error || "We couldn't start a password reset.",
        });
        return;
      }
      setStatus({ pending: false, sent: true, error: "" });
    } catch {
      setStatus({ pending: false, sent: false, error: "We couldn't start a password reset." });
    }
  }

  /* The confirmation deliberately does not say whether an account exists — it mirrors the
   * endpoint's own refusal to distinguish, and re-adding that detail here would undo it. */
  if (status.sent) {
    return (
      <div className="mt-8 space-y-4">
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          If that address has an account, a reset link is on its way. The link works once and expires
          in 30 minutes.
        </p>
        <p className="text-sm text-slate-500">
          Didn&apos;t get it? Check spam, then{" "}
          <button
            type="button"
            onClick={() => setStatus({ pending: false, sent: false, error: "" })}
            className="font-semibold text-slate-800 underline underline-offset-2"
          >
            try again
          </button>
          .
        </p>
        <p className="text-sm text-slate-500">
          <Link href="/login" className="font-semibold text-slate-800 underline underline-offset-2">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <div>
        <Label htmlFor="forgot-email">Email</Label>
        <Input
          id="forgot-email"
          type="email"
          value={email}
          required
          maxLength={320}
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      {status.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{status.error}</p>
      )}

      <Button type="submit" disabled={status.pending} className="w-full">
        {status.pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
