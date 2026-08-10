"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MIN_PASSWORD_LENGTH = 12;

export default function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [status, setStatus] = useState({ pending: false, error: "" });

  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  async function handleSubmit(event) {
    event.preventDefault();
    if (form.password.length < MIN_PASSWORD_LENGTH) {
      setStatus({ pending: false, error: `Use at least ${MIN_PASSWORD_LENGTH} characters.` });
      return;
    }

    setStatus({ pending: true, error: "" });
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus({
          pending: false,
          error: body?.issues?.length
            ? body.issues.map((issue) => issue.message).join("; ")
            : body?.error || "We couldn't create the account.",
        });
        return;
      }

      /* Sign in straight away. The endpoint reports the same success whether or not an account
       * was created — it must not reveal which addresses are registered — so the sign-in result
       * is what actually tells us whether these credentials are valid. */
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (result?.error) {
        setStatus({
          pending: false,
          error: "That email is already registered. Try signing in instead.",
        });
        return;
      }
      router.push("/account");
      router.refresh();
    } catch {
      setStatus({ pending: false, error: "We couldn't create the account." });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <div>
        <Label htmlFor="signup-name">Your name</Label>
        <Input id="signup-name" value={form.name} required maxLength={120} autoComplete="name"
          onChange={(event) => update("name", event.target.value)} />
      </div>
      <div>
        <Label htmlFor="signup-email">Email</Label>
        <Input id="signup-email" type="email" value={form.email} required maxLength={320} autoComplete="email"
          onChange={(event) => update("email", event.target.value)} />
      </div>
      <div>
        <Label htmlFor="signup-password">Password</Label>
        <Input id="signup-password" type="password" value={form.password} required
          minLength={MIN_PASSWORD_LENGTH} maxLength={72} autoComplete="new-password"
          onChange={(event) => update("password", event.target.value)} />
        <span className="mt-1 block text-xs text-slate-500">
          At least {MIN_PASSWORD_LENGTH} characters. Length matters more than symbols.
        </span>
      </div>

      {status.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{status.error}</p>
      )}

      <Button type="submit" disabled={status.pending} className="w-full">
        {status.pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
