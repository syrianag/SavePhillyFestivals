"use client";

import { useState } from "react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 72;

export default function ResetPasswordForm({ token }) {
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [status, setStatus] = useState({ pending: false, done: false, error: "" });

  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  async function handleSubmit(event) {
    event.preventDefault();
    if (form.password.length < MIN_PASSWORD_LENGTH) {
      setStatus({ pending: false, done: false, error: `Use at least ${MIN_PASSWORD_LENGTH} characters.` });
      return;
    }
    /* Confirmation is checked here only. The API takes a single password field: a server-side
     * mismatch check would just be a second copy of the same rule with no security value. */
    if (form.password !== form.confirm) {
      setStatus({ pending: false, done: false, error: "Those passwords don't match." });
      return;
    }

    setStatus({ pending: true, done: false, error: "" });
    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password: form.password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus({
          pending: false,
          done: false,
          error: body?.issues?.length
            ? body.issues.map((issue) => issue.message).join("; ")
            : body?.error || "We couldn't reset the password.",
        });
        return;
      }
      setStatus({ pending: false, done: true, error: "" });
    } catch {
      setStatus({ pending: false, done: false, error: "We couldn't reset the password." });
    }
  }

  if (status.done) {
    return (
      <div className="mt-8 space-y-4">
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Your password has been changed. Any other devices already signed in to this account have
          been signed out.
        </p>
        <Link href="/login" className={buttonVariants({ className: "w-full font-semibold" })}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <div>
        <Label htmlFor="reset-password">New password</Label>
        <Input
          id="reset-password"
          type="password"
          value={form.password}
          required
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={MAX_PASSWORD_LENGTH}
          autoComplete="new-password"
          onChange={(event) => update("password", event.target.value)}
        />
        <span className="mt-1 block text-xs text-slate-500">
          At least {MIN_PASSWORD_LENGTH} characters. Length matters more than symbols.
        </span>
      </div>

      <div>
        <Label htmlFor="reset-password-confirm">Confirm new password</Label>
        <Input
          id="reset-password-confirm"
          type="password"
          value={form.confirm}
          required
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={MAX_PASSWORD_LENGTH}
          autoComplete="new-password"
          onChange={(event) => update("confirm", event.target.value)}
        />
      </div>

      {status.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{status.error}</p>
      )}

      <Button type="submit" disabled={status.pending} className="w-full">
        {status.pending ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}
