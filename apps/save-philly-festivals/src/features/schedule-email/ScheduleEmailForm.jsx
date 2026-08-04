"use client";

import { useMemo, useState } from "react";
import { Mail } from "lucide-react";
import { SCHEDULE_STORAGE_VERSION } from "@/features/schedule/schedule-storage";

function newIdempotencyKey() {
  return window.crypto.randomUUID();
}

export function ScheduleEmailForm({ items, inputId }) {
  const [email, setEmail] = useState("");
  const [submission, setSubmission] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const selectionKey = useMemo(
    () => items.map((item) => `${item.type}:${String(item.id)}`).join("|"),
    [items]
  );



  async function handleSubmit(event) {
    event.preventDefault();
    if (items.length === 0 || submitting) return;

    const signature = `${email.trim().toLowerCase()}|${selectionKey}`;
    const submissionKey = submission?.signature === signature
      ? submission.key
      : newIdempotencyKey();
    setSubmission({ key: submissionKey, signature });
    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/schedules/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          idempotency_key: submissionKey,
          selection: {
            version: SCHEDULE_STORAGE_VERSION,
            items: items.map(({ type, id }) => ({ type, id: String(id) })),
          },
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (response.ok && result.email_sent) {
        const unavailableCount = result.unavailable_items?.length || 0;
        setFeedback({
          kind: "success",
          message: unavailableCount
            ? `Schedule emailed. ${unavailableCount} unavailable ${unavailableCount === 1 ? "selection was" : "selections were"} omitted; your saved schedule remains intact.`
            : "Schedule emailed successfully. Your saved schedule remains intact.",
        });
      } else {
        setFeedback({
          kind: "error",
          message: result.message || result.error || "Email delivery failed. Your schedule is still saved here; retry when ready.",
        });
      }
    } catch {
      setFeedback({
        kind: "error",
        message: "Could not reach email delivery. Your schedule is still saved here; check your connection and retry.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const helpId = `${inputId}-help`;
  const feedbackId = `${inputId}-feedback`;

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-[#333333] bg-[#1A1A1A] p-3">
      <label htmlFor={inputId} className="font-body text-sm font-semibold text-white">
        Email this schedule
      </label>
      <p id={helpId} className="mt-1 font-ui text-xs leading-relaxed text-[#A9A9A9]">
        Send every saved item to your inbox. This is transactional and does not sign you up for marketing.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
        <input
          id={inputId}
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setFeedback(null);
          }}
          aria-describedby={`${helpId} ${feedbackId}`}
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-full border border-brand-text-muted bg-[#111111] px-4 py-2 font-ui text-sm text-white placeholder:text-brand-text-muted focus:border-white focus:outline-none focus:ring-2 focus:ring-brand-yellow"
        />
        <button
          type="submit"
          disabled={submitting || items.length === 0}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-brand-yellow px-4 font-body text-sm font-bold text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Mail className="size-4" aria-hidden="true" />
          {submitting ? "Sending…" : "Email schedule"}
        </button>
      </div>
      <div
        id={feedbackId}
        role={feedback?.kind === "error" ? "alert" : "status"}
        aria-live="polite"
        className={`mt-2 min-h-5 font-ui text-xs ${feedback?.kind === "error" ? "text-brand-yellow" : "text-emerald-300"}`}
      >
        {feedback?.message || ""}
      </div>
    </form>
  );
}
