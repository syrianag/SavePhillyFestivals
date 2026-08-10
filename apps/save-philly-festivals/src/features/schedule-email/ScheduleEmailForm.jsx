"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail } from "lucide-react";
import { SCHEDULE_STORAGE_VERSION } from "@/features/schedule/schedule-storage";
import {
  CONSENT_SOURCE,
  CONSENT_TEXT,
  CONSENT_VERSION,
  PREFERENCE_VERSION,
} from "@/features/organizer-consent/organizer-consent-copy";

const preferenceOptions = [
  ["reminders", "Reminders"],
  ["updates", "Updates"],
  ["discovery", "Discovery"],
];
function newIdempotencyKey() {
  return window.crypto.randomUUID();
}

export function ScheduleEmailForm({ items, inputId }) {
  const [email, setEmail] = useState("");
  const [emailSubmission, setEmailSubmission] = useState(null);
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState(null);
  const [organizers, setOrganizers] = useState([]);
  const [eligibilityUnavailable, setEligibilityUnavailable] = useState(false);
  const [selectedOrganizers, setSelectedOrganizers] = useState([]);
  const [preferences, setPreferences] = useState([]);
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);
  const [consentSubmission, setConsentSubmission] = useState(null);
  const [consentSubmitting, setConsentSubmitting] = useState(false);
  const [consentFeedback, setConsentFeedback] = useState(null);
  const [consentManagement, setConsentManagement] = useState(null);
  const selectionKey = useMemo(
    () => items.map((item) => `${item.type}:${String(item.id)}`).join("|"),
    [items]
  );
  const selection = useMemo(() => ({
    version: SCHEDULE_STORAGE_VERSION,
    items: items.map(({ type, id }) => ({ type, id: String(id) })),
  }), [items]);

  useEffect(() => {
    const controller = new AbortController();
    if (!items.length) return () => controller.abort();
    fetch("/api/organizer-consent/eligibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selection }),
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error("eligibility unavailable");
      const result = await response.json();
      const eligibleOrganizers = result.organizers || [];
      const eligibleIds = new Set(eligibleOrganizers.map(({ id }) => id));
      setOrganizers(eligibleOrganizers);
      setSelectedOrganizers((current) => current.filter((id) => eligibleIds.has(id)));
      setConsentAcknowledged(false);
      setEligibilityUnavailable(false);
    }).catch((error) => {
      if (error.name !== "AbortError") {
        setOrganizers([]);
        setEligibilityUnavailable(true);
      }
    });
    return () => controller.abort();
  }, [items.length, selection, selectionKey]);

  async function handleEmailSubmit(event) {
    event.preventDefault();
    if (items.length === 0 || emailSubmitting) return;
    const signature = `${email.trim().toLowerCase()}|${selectionKey}`;
    const submissionKey = emailSubmission?.signature === signature ? emailSubmission.key : newIdempotencyKey();
    setEmailSubmission({ key: submissionKey, signature });
    setEmailSubmitting(true);
    setEmailFeedback(null);
    try {
      const response = await fetch("/api/schedules/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, idempotency_key: submissionKey, selection }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.email_sent) {
        const unavailableCount = result.unavailable_items?.length || 0;
        setEmailFeedback({ kind: "success", message: unavailableCount
          ? `Schedule emailed. ${unavailableCount} unavailable ${unavailableCount === 1 ? "selection was" : "selections were"} omitted; your saved schedule remains intact.`
          : "Schedule emailed successfully. Your saved schedule remains intact." });
      } else {
        setEmailFeedback({ kind: "error", message: result.message || result.error || "Email delivery failed. Your schedule is still saved here; retry when ready." });
      }
    } catch {
      setEmailFeedback({ kind: "error", message: "Could not reach email delivery. Your schedule is still saved here; check your connection and retry." });
    } finally {
      setEmailSubmitting(false);
    }
  }

  async function handleConsentSubmit(event) {
    event.preventDefault();
    if (consentSubmitting || !selectedOrganizers.length || !preferences.length) return;
    const signature = `${email.trim().toLowerCase()}|${selectionKey}|${[...selectedOrganizers].sort()}|${[...preferences].sort()}`;
    const submissionKey = consentSubmission?.signature === signature ? consentSubmission.key : newIdempotencyKey();
    setConsentSubmission({ key: submissionKey, signature });
    setConsentSubmitting(true);
    setConsentFeedback(null);
    try {
      const response = await fetch("/api/organizer-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          submission_key: submissionKey,
          selection,
          organizer_ids: selectedOrganizers,
          preferences,
          consent_acknowledged: consentAcknowledged,
          consent_version: CONSENT_VERSION,
          preference_version: PREFERENCE_VERSION,
          source: CONSENT_SOURCE,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Consent could not be recorded.");
      if (result.management_token) setConsentManagement({ consentId: result.consent_id, token: result.management_token });
      const omitted = result.ineligible_organizers || 0;
      setConsentFeedback({ kind: "success", message: omitted
        ? `Organizer request queued for ${result.queued_organizers}; ${omitted} organizer is no longer eligible and was not queued.`
        : `Organizer request queued for ${result.queued_organizers} ${result.queued_organizers === 1 ? "organizer" : "organizers"}. This is separate from schedule email delivery.` });
    } catch (error) {
      setConsentFeedback({ kind: "error", message: `${error.message} Your schedule remains saved.` });
    } finally {
      setConsentSubmitting(false);
    }
  }

  async function handleConsentRevocation() {
    if (!consentManagement || consentSubmitting) return;
    setConsentSubmitting(true);
    try {
      const response = await fetch("/api/organizer-consent", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent_id: consentManagement.consentId, management_token: consentManagement.token }),
      });
      if (!response.ok) throw new Error();
      setConsentManagement(null);
      setConsentFeedback({ kind: "success", message: "Organizer consent revoked and pending requests suppressed." });
    } catch {
      setConsentFeedback({ kind: "error", message: "Revocation could not be confirmed. Please retry from this page." });
    } finally {
      setConsentSubmitting(false);
    }
  }

  const helpId = `${inputId}-help`;
  const emailFeedbackId = `${inputId}-feedback`;
  const consentFeedbackId = `${inputId}-consent-feedback`;

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-2xs">
      <form onSubmit={handleEmailSubmit}>
        <label htmlFor={inputId} className="font-body text-sm font-semibold text-slate-900">Email this schedule</label>
        <p id={helpId} className="mt-1 font-ui text-xs leading-relaxed text-slate-500">
          Send every saved item to your inbox. This is transactional and does not sign you up for marketing.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
          <input id={inputId} name="email" type="email" autoComplete="email" required maxLength={254} value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setEmailFeedback(null);
              setConsentFeedback(null);
              setConsentAcknowledged(false);
            }}
            aria-describedby={`${helpId} ${emailFeedbackId}`}
            placeholder="you@example.com"
            className="min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 font-ui text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <button type="submit" disabled={emailSubmitting || items.length === 0}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-slate-900 px-4 font-body text-sm font-bold text-white hover:bg-slate-800 transition-opacity disabled:cursor-not-allowed disabled:opacity-50">
            <Mail className="size-4" aria-hidden="true" /> {emailSubmitting ? "Sending…" : "Email schedule"}
          </button>
        </div>
        <div id={emailFeedbackId} role={emailFeedback?.kind === "error" ? "alert" : "status"} aria-live="polite"
          className={`mt-2 min-h-5 font-ui text-xs ${emailFeedback?.kind === "error" ? "text-red-700" : "text-emerald-700"}`}>
          {emailFeedback?.message || ""}
        </div>
      </form>

      <form onSubmit={handleConsentSubmit} className="mt-3 border-t border-slate-200 pt-3">
        <fieldset disabled={consentSubmitting || !organizers.length}>
          <legend className="font-body text-sm font-semibold text-slate-900">Optional organizer emails</legend>
          <p className="mt-1 font-ui text-xs leading-relaxed text-slate-500">
            Separately choose which authorized organizers may email you. Nothing is selected by default.
          </p>
          {organizers.map((organizer) => (
            <label key={organizer.id} className="mt-2 flex items-start gap-2 font-ui text-xs text-slate-700">
              <input type="checkbox" checked={selectedOrganizers.includes(organizer.id)}
                onChange={() => {
                  setSelectedOrganizers((current) => current.includes(organizer.id)
                    ? current.filter((id) => id !== organizer.id)
                    : [...current, organizer.id]);
                  setConsentAcknowledged(false);
                }}
                className="mt-0.5 size-4 accent-slate-900" />
              <span><strong>{organizer.name}</strong> for {organizer.festival_name}</span>
            </label>
          ))}
          {!organizers.length && <p className="mt-2 font-ui text-xs text-slate-500">{eligibilityUnavailable ? "Organizer choices are temporarily unavailable." : "No selected festival currently offers authorized organizer emails."}</p>}
          {organizers.length > 0 && <div className="mt-3">
            <p className="font-ui text-xs font-semibold text-slate-900">Choose email categories:</p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2">
              {preferenceOptions.map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 font-ui text-xs text-slate-700">
                  <input type="checkbox" checked={preferences.includes(value)}
                    onChange={() => {
                      setPreferences((current) => current.includes(value)
                        ? current.filter((entry) => entry !== value)
                        : [...current, value]);
                      setConsentAcknowledged(false);
                    }}
                    className="size-4 accent-slate-900" /> {label}
                </label>
              ))}
            </div>
          </div>}
        </fieldset>
        {organizers.length > 0 && (
          <label className="mt-3 flex items-start gap-2 font-ui text-xs text-slate-700">
            <input
              type="checkbox"
              checked={consentAcknowledged}
              onChange={(event) => setConsentAcknowledged(event.target.checked)}
              className="mt-0.5 size-4 accent-slate-900"
            />
            <span>{CONSENT_TEXT}</span>
          </label>
        )}
        <button type="submit" disabled={consentSubmitting || !email || !selectedOrganizers.length || !preferences.length || !consentAcknowledged}
          className="mt-3 min-h-10 rounded-full border border-slate-300 px-4 font-body text-xs font-bold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
          {consentSubmitting ? "Recording…" : "Request organizer emails"}
        </button>
        {consentManagement && <button type="button" onClick={handleConsentRevocation} disabled={consentSubmitting}
          className="ml-2 mt-3 font-ui text-xs text-slate-500 underline disabled:opacity-50">
          Revoke organizer request
        </button>}
        <div id={consentFeedbackId} role={consentFeedback?.kind === "error" ? "alert" : "status"} aria-live="polite"
          className={`mt-2 min-h-5 font-ui text-xs ${consentFeedback?.kind === "error" ? "text-red-700" : "text-emerald-700"}`}>
          {consentFeedback?.message || ""}
        </div>
      </form>
    </div>
  );
}
