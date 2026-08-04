"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { producerApi } from "./producer-api";
import { dateOnly, isoToNewYorkLocal, newYorkLocalToIso } from "./producer-dates";

const emptyForm = {
  name: "",
  description: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  website_url: "",
  location: "",
  city: "Philadelphia",
  state: "PA",
  zip_code: "",
  calendar_date_type: "timed",
  start_date: "",
  end_date: "",
  all_day_start: "",
  all_day_end: "",
};

const inputClass = "mt-2 min-h-11 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100 disabled:text-slate-600";
const labelClass = "block min-w-0 text-sm font-semibold text-slate-800";

function formFromFestival(festival) {
  return {
    ...emptyForm,
    ...Object.fromEntries(Object.keys(emptyForm).map((key) => [key, festival[key] ?? emptyForm[key]])),
    start_date: isoToNewYorkLocal(festival.start_date),
    end_date: isoToNewYorkLocal(festival.end_date),
    all_day_start: dateOnly(festival.all_day_start),
    all_day_end: dateOnly(festival.all_day_end),
  };
}

function editablePayload(form, revision) {
  const timed = form.calendar_date_type === "timed";
  return {
    expected_revision: revision,
    name: form.name.trim(),
    description: form.description.trim() || null,
    contact_name: form.contact_name.trim() || null,
    contact_email: form.contact_email.trim() || null,
    contact_phone: form.contact_phone.trim() || null,
    website_url: form.website_url.trim() || null,
    location: form.location.trim() || null,
    city: form.city.trim() || null,
    state: form.state.trim() || null,
    zip_code: form.zip_code.trim() || null,
    calendar_date_type: form.calendar_date_type,
    time_zone: "America/New_York",
    start_date: timed && form.start_date ? newYorkLocalToIso(form.start_date) : null,
    end_date: timed && form.end_date ? newYorkLocalToIso(form.end_date) : null,
    all_day_start: timed ? null : form.all_day_start || null,
    all_day_end: timed ? null : form.all_day_end || null,
  };
}

function reviewIssues(form) {
  const issues = [];
  const required = [
    ["name", "Festival name is required."],
    ["description", "A description of at least 20 characters is required."],
    ["contact_name", "Contact name is required."],
    ["contact_email", "Contact email is required."],
    ["location", "Location is required."],
    ["city", "City is required."],
    ["state", "State is required."],
    ["zip_code", "ZIP code is required."],
  ];
  required.forEach(([path, message]) => {
    if (!form[path].trim() || (path === "description" && form[path].trim().length < 20)) issues.push({ path, message });
  });
  if (form.calendar_date_type === "timed") {
    if (!form.start_date) issues.push({ path: "start_date", message: "Start date and time is required." });
    if (!form.end_date) issues.push({ path: "end_date", message: "End date and time is required." });
    if (form.start_date && form.end_date && form.end_date <= form.start_date) issues.push({ path: "end_date", message: "End must be after start." });
  } else {
    if (!form.all_day_start) issues.push({ path: "all_day_start", message: "Start date is required." });
    if (!form.all_day_end) issues.push({ path: "all_day_end", message: "End date is required." });
    if (form.all_day_start && form.all_day_end && form.all_day_end < form.all_day_start) issues.push({ path: "all_day_end", message: "End date cannot be before start date." });
  }
  return issues;
}

function ErrorSummary({ message, issues }) {
  if (!message && !issues.length) return null;
  return (
    <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-900" role="alert" aria-labelledby="submission-errors-title">
      <h2 id="submission-errors-title" className="font-bold">Please fix the following</h2>
      {message && <p className="mt-1">{message}</p>}
      {issues.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {issues.map((issue, index) => <li key={`${issue.path}-${index}`}><a className="underline" href={`#${issue.path}`}>{issue.message}</a></li>)}
        </ul>
      )}
    </div>
  );
}

function Field({ id, label, children }) {
  return <label htmlFor={id} className={labelClass}>{label}{children}</label>;
}

function AssetUploader({ festivalId, disabled }) {
  const [status, setStatus] = useState({ pending: false, error: "", success: "" });

  async function upload(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const data = new FormData(element);
    data.set("rights_version", "1");
    setStatus({ pending: true, error: "", success: "" });
    try {
      await producerApi.upload(festivalId, data);
      element.reset();
      setStatus({ pending: false, error: "", success: "Private asset uploaded successfully. It is not publicly accessible." });
    } catch (error) {
      setStatus({ pending: false, error: error.message, success: "" });
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="asset-heading">
      <h2 id="asset-heading" className="font-heading text-xl font-bold">Private festival asset</h2>
      <p className="mt-1 text-sm text-slate-600">Upload a JPEG, PNG, or WebP up to 10 MB. Files remain private while your submission is reviewed.</p>
      {status.error && <p className="mt-3 rounded-md bg-red-50 p-3 text-red-800" role="alert">{status.error}</p>}
      {status.success && <p className="mt-3 rounded-md bg-green-50 p-3 text-green-800" role="status">{status.success}</p>}
      <form onSubmit={upload} className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field id="asset-file" label="Image file">
          <input id="asset-file" name="file" type="file" accept="image/jpeg,image/png,image/webp" required disabled={disabled || status.pending} className={inputClass} />
        </Field>
        <Field id="purpose" label="Purpose">
          <select id="purpose" name="purpose" defaultValue="hero_image" required disabled={disabled || status.pending} className={inputClass}>
            <option value="logo">Logo</option><option value="hero_image">Hero image</option><option value="gallery_image">Gallery image</option>
          </select>
        </Field>
        <Field id="alt_text" label="Image description (alt text)">
          <input id="alt_text" name="alt_text" required maxLength={500} disabled={disabled || status.pending} className={inputClass} />
        </Field>
        <label className="flex items-start gap-3 self-end rounded-md bg-slate-50 p-3 text-sm font-medium text-slate-800">
          <input name="rights_acknowledged" value="true" type="checkbox" required disabled={disabled || status.pending} className="mt-1 size-4" />
          I have the rights to provide this image for festival review and publication.
        </label>
        <button type="submit" disabled={disabled || status.pending} className="rounded-md bg-slate-900 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2">
          {status.pending ? "Uploading…" : "Upload private asset"}
        </button>
      </form>
    </section>
  );
}

export default function ProducerSubmissionEditor({ festivalId: initialFestivalId = null }) {
  const router = useRouter();
  const submissionKey = useRef(null);
  const [festival, setFestival] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState({ message: "", issues: [] });
  const [reviewing, setReviewing] = useState(false);
  const [acks, setAcks] = useState({ representation: false, accuracy: false, terms: false });
  const [uploadsEnabled, setUploadsEnabled] = useState(false);
  const [mutationsEnabled, setMutationsEnabled] = useState(false);
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(true);

  useEffect(() => {
    let active = true;
    producerApi.capabilities().then((capabilities) => {
      if (active) {
        setUploadsEnabled(capabilities.uploads?.enabled === true);
        setMutationsEnabled(capabilities.mutations?.enabled === true);
        setCapabilitiesLoading(false);
      }
    }).catch(() => {
      if (active) {
        setUploadsEnabled(false);
        setMutationsEnabled(false);
        setCapabilitiesLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (capabilitiesLoading || (!initialFestivalId && !mutationsEnabled)) return undefined;

    let active = true;
    async function load() {
      try {
        let loaded;
        if (initialFestivalId) {
          loaded = (await producerApi.get(initialFestivalId)).festival;
        } else {
          submissionKey.current ||= crypto.randomUUID();
          loaded = (await producerApi.create(submissionKey.current)).festival;
          router.replace(`/producer/submit?id=${encodeURIComponent(loaded.id)}`);
        }
        if (active) {
          setFestival(loaded);
          setForm(formFromFestival(loaded));
          setLoading(false);
        }
      } catch (requestError) {
        if (active) {
          setError({ message: requestError.message, issues: requestError.issues || [] });
          setLoading(false);
        }
      }
    }
    load();
    return () => { active = false; };
  }, [capabilitiesLoading, initialFestivalId, mutationsEnabled, router]);

  function update(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setNotice("");
  }

  async function saveDraft(event) {
    event?.preventDefault();
    if (!festival || festival.workflow_state === "pending_review" || !mutationsEnabled) return festival;
    setPendingAction("save");
    setError({ message: "", issues: [] });
    setNotice("");
    try {
      const payload = editablePayload(form, festival.revision);
      const updated = (await producerApi.patch(festival.id, payload)).festival;
      setFestival(updated);
      setNotice("Draft saved.");
      return updated;
    } catch (requestError) {
      setError({ message: requestError.message, issues: requestError.issues || [] });
      return null;
    } finally {
      setPendingAction("");
    }
  }

  async function review() {
    const issues = reviewIssues(form);
    if (issues.length) {
      setError({ message: "Complete the required fields before review.", issues });
      document.getElementById("submission-errors-title")?.focus();
      return;
    }
    const updated = await saveDraft();
    if (updated) {
      setReviewing(true);
      setNotice("Review your festival details and acknowledge the statements below.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function submit() {
    if (!acks.representation || !acks.accuracy || !acks.terms) {
      setError({ message: "All three acknowledgments are required before submission.", issues: [] });
      return;
    }
    setPendingAction("submit");
    setError({ message: "", issues: [] });
    try {
      const submitted = (await producerApi.submit(festival.id, {
        expected_revision: festival.revision,
        representation_acknowledged: true,
        accuracy_acknowledged: true,
        terms_acknowledged: true,
        terms_version: 1,
      })).festival;
      setFestival(submitted);
      setForm(formFromFestival(submitted));
      setReviewing(false);
      setNotice("Submission received and pending review.");
    } catch (requestError) {
      setError({ message: requestError.message, issues: requestError.issues || [] });
    } finally {
      setPendingAction("");
    }
  }

  if (!capabilitiesLoading && !initialFestivalId && !mutationsEnabled) {
    return <ErrorSummary message="Draft changes are temporarily unavailable." issues={[]} />;
  }
  if (loading) return <p role="status" className="rounded-xl border bg-white p-6">Loading your submission…</p>;
  if (!festival) return <ErrorSummary message={error.message} issues={error.issues} />;

  const pendingReview = festival.workflow_state === "pending_review";
  const capabilityReadOnly = !mutationsEnabled;
  const readOnly = pendingReview || capabilityReadOnly;
  return (
    <div className="min-w-0 space-y-6">
      <header className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl font-bold sm:text-4xl">{pendingReview ? "Submission pending review" : reviewing ? "Review submission" : "Festival submission"}</h1>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-900">{pendingReview ? "Pending review" : capabilityReadOnly ? "Draft — changes unavailable" : "Draft"}</span>
        </div>
        <p className="mt-2 max-w-3xl text-slate-600">{pendingReview ? "Your submission is read-only while the Philly Festivals team reviews it." : capabilityReadOnly ? "This draft is still private. Changes are temporarily unavailable until required production protections are restored." : "Save as often as you need. Your festival is not public until it is reviewed and approved."}</p>
      </header>

      <div aria-live="polite" aria-atomic="true">{notice && <p className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-900" role="status">{notice}</p>}</div>
      <ErrorSummary message={error.message} issues={error.issues} />

      {reviewing && !readOnly ? (
        <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-7" aria-labelledby="review-details-heading">
          <h2 id="review-details-heading" className="font-heading text-2xl font-bold">Review festival details</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div><dt className="font-semibold text-slate-500">Name</dt><dd className="break-words">{form.name}</dd></div>
            <div><dt className="font-semibold text-slate-500">Contact</dt><dd className="break-words">{form.contact_name}<br />{form.contact_email}<br />{form.contact_phone}</dd></div>
            <div className="sm:col-span-2"><dt className="font-semibold text-slate-500">Description</dt><dd className="whitespace-pre-wrap break-words">{form.description}</dd></div>
            <div><dt className="font-semibold text-slate-500">Location</dt><dd className="break-words">{form.location}, {form.city}, {form.state} {form.zip_code}</dd></div>
            <div><dt className="font-semibold text-slate-500">Dates</dt><dd>{form.calendar_date_type === "timed" ? `${form.start_date} to ${form.end_date} America/New_York` : `${form.all_day_start} through ${form.all_day_end} (all day)`}</dd></div>
          </dl>
          <div className="space-y-3 border-t border-slate-200 pt-5">
            <label className="flex gap-3"><input type="checkbox" checked={acks.representation} onChange={(event) => setAcks((value) => ({ ...value, representation: event.target.checked }))} className="mt-1 size-4" /> I am authorized to represent this festival.</label>
            <label className="flex gap-3"><input type="checkbox" checked={acks.accuracy} onChange={(event) => setAcks((value) => ({ ...value, accuracy: event.target.checked }))} className="mt-1 size-4" /> The information is accurate to the best of my knowledge.</label>
            <label className="flex gap-3"><input type="checkbox" checked={acks.terms} onChange={(event) => setAcks((value) => ({ ...value, terms: event.target.checked }))} className="mt-1 size-4" /> I agree to the producer submission terms.</label>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setReviewing(false)} disabled={Boolean(pendingAction)} className="rounded-md border border-slate-300 px-5 py-3 font-semibold">Edit details</button>
            <button type="button" onClick={submit} disabled={Boolean(pendingAction)} className="rounded-md bg-black px-5 py-3 font-semibold text-white disabled:opacity-60">{pendingAction === "submit" ? "Submitting…" : "Submit for review"}</button>
          </div>
        </section>
      ) : (
        <form onSubmit={saveDraft} className="space-y-6">
          <fieldset disabled={readOnly || Boolean(pendingAction)} className="space-y-6 disabled:opacity-90">
            <section className="grid min-w-0 gap-5 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 sm:p-7" aria-labelledby="festival-details-heading">
              <h2 id="festival-details-heading" className="font-heading text-2xl font-bold sm:col-span-2">Festival details</h2>
              <Field id="name" label="Festival name"><input id="name" name="name" value={form.name} onChange={update} maxLength={200} className={inputClass} /></Field>
              <Field id="website_url" label="Website (optional)"><input id="website_url" name="website_url" type="url" value={form.website_url} onChange={update} className={inputClass} /></Field>
              <Field id="description" label="Description"><textarea id="description" name="description" value={form.description} onChange={update} maxLength={10000} rows={6} className={`${inputClass} sm:col-span-2`} /></Field>
              <Field id="location" label="Venue or street address"><input id="location" name="location" value={form.location} onChange={update} maxLength={500} className={inputClass} /></Field>
              <Field id="city" label="City"><input id="city" name="city" value={form.city} onChange={update} maxLength={100} className={inputClass} /></Field>
              <Field id="state" label="State"><input id="state" name="state" value={form.state} onChange={update} maxLength={2} className={inputClass} /></Field>
              <Field id="zip_code" label="ZIP code"><input id="zip_code" name="zip_code" inputMode="numeric" value={form.zip_code} onChange={update} maxLength={10} className={inputClass} /></Field>
            </section>

            <section className="grid min-w-0 gap-5 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 sm:p-7" aria-labelledby="contact-heading">
              <h2 id="contact-heading" className="font-heading text-2xl font-bold sm:col-span-2">Private contact</h2>
              <Field id="contact_name" label="Contact name"><input id="contact_name" name="contact_name" value={form.contact_name} onChange={update} maxLength={200} className={inputClass} /></Field>
              <Field id="contact_email" label="Contact email"><input id="contact_email" name="contact_email" type="email" value={form.contact_email} onChange={update} className={inputClass} /></Field>
              <Field id="contact_phone" label="Contact phone (optional)"><input id="contact_phone" name="contact_phone" type="tel" value={form.contact_phone} onChange={update} maxLength={40} className={inputClass} /></Field>
            </section>

            <section className="grid min-w-0 gap-5 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 sm:p-7" aria-labelledby="dates-heading">
              <h2 id="dates-heading" className="font-heading text-2xl font-bold sm:col-span-2">Festival dates</h2>
              <Field id="calendar_date_type" label="Date type"><select id="calendar_date_type" name="calendar_date_type" value={form.calendar_date_type} onChange={update} className={inputClass}><option value="timed">Specific start and end times</option><option value="all_day">All day</option></select></Field>
              <p className="self-end rounded-md bg-slate-50 p-3 text-sm text-slate-600">Times are interpreted in America/New_York, including daylight saving time.</p>
              {form.calendar_date_type === "timed" ? (
                <><Field id="start_date" label="Start date and time"><input id="start_date" name="start_date" type="datetime-local" value={form.start_date} onChange={update} className={inputClass} /></Field><Field id="end_date" label="End date and time"><input id="end_date" name="end_date" type="datetime-local" value={form.end_date} onChange={update} className={inputClass} /></Field></>
              ) : (
                <><Field id="all_day_start" label="Start date"><input id="all_day_start" name="all_day_start" type="date" value={form.all_day_start} onChange={update} className={inputClass} /></Field><Field id="all_day_end" label="End date"><input id="all_day_end" name="all_day_end" type="date" value={form.all_day_end} onChange={update} className={inputClass} /></Field></>
              )}
            </section>
          </fieldset>

          {!readOnly && (
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button type="submit" disabled={Boolean(pendingAction)} className="rounded-md border border-slate-400 bg-white px-5 py-3 font-semibold disabled:opacity-60">{pendingAction === "save" ? "Saving…" : "Save draft"}</button>
              <button type="button" onClick={review} disabled={Boolean(pendingAction)} className="rounded-md bg-black px-5 py-3 font-semibold text-white disabled:opacity-60">Review submission</button>
            </div>
          )}
        </form>
      )}

      {!reviewing && (uploadsEnabled
        ? <AssetUploader festivalId={festival.id} disabled={readOnly} />
        : <section className="rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="asset-heading"><h2 id="asset-heading" className="font-heading text-xl font-bold">Private festival asset</h2><p className="mt-1 text-sm text-slate-600">Image uploads are not currently available. You can save and submit the festival details without an image.</p></section>)}
    </div>
  );
}
