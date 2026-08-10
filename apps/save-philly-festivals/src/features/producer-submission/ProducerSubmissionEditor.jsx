"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { producerApi } from "./producer-api";
import { dateOnly, isoToNewYorkLocal, newYorkLocalToIso } from "./producer-dates";
import { 
  Sparkles,
  Calendar,
  User,
  Clock,
  FileText,
  AlertTriangle,
  UploadCloud,
  CheckCircle,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Building,
  Mail,
  Phone,
  Bookmark
} from "lucide-react";

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

const inputClass = "mt-2 min-h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-950 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:bg-slate-50 disabled:text-slate-500 transition-colors";
const labelClass = "block min-w-0 text-xs font-bold text-slate-700 uppercase tracking-wider";

const workflowBadgeConfig = {
  draft: { variant: "secondary", className: "bg-slate-100 text-slate-700 border-slate-200", label: "Draft" },
  pending_review: { variant: "outline", className: "bg-amber-50 text-amber-800 border-amber-200", label: "Pending review" },
  changes_requested: { variant: "outline", className: "bg-purple-50 text-purple-800 border-purple-200", label: "Changes Requested" },
  approved: { variant: "outline", className: "bg-blue-50 text-blue-800 border-blue-200", label: "Approved" },
  rejected: { variant: "destructive", className: "bg-red-50 text-red-800 border-red-200", label: "Rejected" },
  published: { variant: "default", className: "bg-green-600 text-white border-green-700", label: "Published" },
  unpublished: { variant: "secondary", className: "bg-zinc-100 text-zinc-700 border-zinc-200", label: "Unpublished" },
  canceled: { variant: "outline", className: "bg-rose-50 text-rose-800 border-rose-200", label: "Canceled" },
  archived: { variant: "secondary", className: "bg-slate-100 text-slate-500 border-slate-200", label: "Archived" },
};

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
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900 shadow-xs" role="alert" aria-labelledby="submission-errors-title">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="size-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <h2 id="submission-errors-title" className="font-bold">Please fix the following</h2>
          {message && <p className="mt-1 text-sm text-red-800">{message}</p>}
          {issues.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-red-800">
              {issues.map((issue, index) => (
                <li key={`${issue.path}-${index}`}>
                  <a className="underline hover:text-red-950 font-semibold" href={`#${issue.path}`}>{issue.message}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, children }) {
  return (
    <div className="space-y-1.5 min-w-0">
      <label htmlFor={id} className={labelClass}>{label}</label>
      {children}
    </div>
  );
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
    <Card className="shadow-sm border-slate-200 bg-white" aria-labelledby="asset-heading">
      <CardHeader className="border-b border-slate-100">
        <CardTitle id="asset-heading" className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <UploadCloud className="size-5 text-slate-500" />
          Private festival asset
        </CardTitle>
        <CardDescription>Upload a JPEG, PNG, or WebP image up to 10 MB. Files remain private during review.</CardDescription>
      </CardHeader>
      
      <form onSubmit={upload}>
        <CardContent className="pt-6 grid gap-5 sm:grid-cols-2">
          {status.error && (
            <div className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-800 flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0 text-red-600" />
              {status.error}
            </div>
          )}
          {status.success && (
            <div className="sm:col-span-2 rounded-lg border border-green-200 bg-green-50 p-3.5 text-xs font-semibold text-green-800 flex items-center gap-2" role="status">
              <CheckCircle className="size-4 shrink-0 text-green-600" />
              {status.success}
            </div>
          )}

          <Field id="asset-file" label="Image file">
            <input 
              id="asset-file" 
              name="file" 
              type="file" 
              accept="image/jpeg,image/png,image/webp" 
              required 
              disabled={disabled || status.pending} 
              className={`${inputClass} pt-2.5 pl-3`} 
            />
          </Field>
          
          <Field id="purpose" label="Purpose">
            <select 
              id="purpose" 
              name="purpose" 
              defaultValue="hero_image" 
              required 
              disabled={disabled || status.pending} 
              className={inputClass}
            >
              <option value="logo">Logo</option>
              <option value="hero_image">Hero image</option>
              <option value="gallery_image">Gallery image</option>
            </select>
          </Field>
          
          <div className="sm:col-span-2">
            <Field id="alt_text" label="Image description (alt text)">
              <input 
                id="alt_text" 
                name="alt_text" 
                required 
                maxLength={500} 
                disabled={disabled || status.pending} 
                className={inputClass} 
                placeholder="Brief alternative text describing this image for accessibility..."
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <label className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-4 text-xs font-semibold text-slate-800 select-none cursor-pointer">
              <input 
                name="rights_acknowledged" 
                value="true" 
                type="checkbox" 
                required 
                disabled={disabled || status.pending} 
                className="mt-0.5 size-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500" 
              />
              <span>I have the rights to provide this image for festival review and publication.</span>
            </label>
          </div>
        </CardContent>
        
        <CardFooter className="border-t border-slate-100 bg-slate-50/50 pt-4">
          <Button 
            type="submit" 
            disabled={disabled || status.pending} 
            className="w-full sm:w-auto font-semibold shadow-xs"
          >
            {status.pending ? "Uploading…" : "Upload private asset"}
          </Button>
        </CardFooter>
      </form>
    </Card>
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
    if (!festival || !["draft", "changes_requested"].includes(festival.workflow_state) || !mutationsEnabled) return festival;
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
  if (loading) {
    return (
      <div role="status" className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-xs">
        <Clock className="size-8 text-slate-300 animate-spin mx-auto mb-3" />
        <div className="text-base font-semibold text-slate-700">Loading your submission…</div>
      </div>
    );
  }
  if (!festival) {
    return <ErrorSummary message={error.message} issues={error.issues} />;
  }

  const pendingReview = festival.workflow_state === "pending_review";
  const editableState = ["draft", "changes_requested"].includes(festival.workflow_state);
  const capabilityReadOnly = !mutationsEnabled;
  const readOnly = !editableState || capabilityReadOnly;
  const latestProducerMessage = [...(festival.workflow_transitions || [])].reverse().find((item) => item.producer_message)?.producer_message;
  
  const badgeConfig = workflowBadgeConfig[festival.workflow_state] || { variant: "outline", label: festival.workflow_state };

  return (
    <div className="min-w-0 space-y-8">
      
      {/* Header section */}
      <header className="min-w-0 border-b border-slate-200 pb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl font-bold sm:text-4xl text-slate-900">
            {pendingReview ? "Submission pending review" : reviewing ? "Review submission" : "Festival submission"}
          </h1>
          <Badge variant={badgeConfig.variant} className={`font-semibold border text-xs px-2.5 py-0.5 ${badgeConfig.className}`}>
            {badgeConfig.label}{capabilityReadOnly && editableState ? " — changes unavailable" : ""}
          </Badge>
        </div>
        <p className="mt-2.5 max-w-3xl text-sm text-slate-600 leading-relaxed">
          {pendingReview ? "Your submission is read-only while the Philly Festivals team reviews it." : festival.workflow_state === "changes_requested" ? "Review the producer-safe feedback, update your festival, and resubmit when ready." : !editableState ? "This submission is read-only. Contact the Philly Festivals team if you need help." : capabilityReadOnly ? "This draft is still private. Changes are temporarily unavailable until required production protections are restored." : "Save as often as you need. Approval is separate from publication, and this record remains private until published."}
        </p>
        
        {latestProducerMessage && (
          <div className="mt-4 p-4 border border-amber-200 bg-amber-50/50 text-amber-950 rounded-lg flex items-start gap-2.5 text-sm">
            <MessageSquare className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5 text-amber-900">Editorial Feedback:</span>
              {latestProducerMessage}
            </div>
          </div>
        )}
      </header>

      {/* Alert Notices */}
      <div aria-live="polite" aria-atomic="true">
        {notice && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-900 flex items-center gap-2 shadow-xs" role="status">
            <CheckCircle className="size-4 shrink-0 text-green-600" />
            {notice}
          </div>
        )}
      </div>
      <ErrorSummary message={error.message} issues={error.issues} />

      {/* Main Review or Edit Content */}
      {reviewing && !readOnly ? (
        <Card className="shadow-xs border-slate-200 bg-white" aria-labelledby="review-details-heading">
          <CardHeader className="border-b border-slate-100">
            <CardTitle id="review-details-heading" className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="size-5 text-indigo-500" />
              Review festival details
            </CardTitle>
            <CardDescription>Confirm your submissions before handing off to editors</CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6 space-y-6">
            <dl className="grid gap-6 sm:grid-cols-2 text-sm">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Bookmark className="size-3.5 text-slate-400" />
                  Festival Name
                </dt>
                <dd className="mt-1.5 font-semibold text-slate-900 wrap-break-word">{form.name}</dd>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="size-3.5 text-slate-400" />
                  Venue Location
                </dt>
                <dd className="mt-1.5 font-semibold text-slate-900 wrap-break-word">
                  {form.location}, {form.city}, {form.state} {form.zip_code}
                </dd>
              </div>

              <div className="sm:col-span-2 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="size-3.5 text-slate-400" />
                  Description
                </dt>
                <dd className="mt-1.5 text-slate-800 whitespace-pre-wrap wrap-break-word">{form.description}</dd>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="size-3.5 text-slate-400" />
                  Contact Info
                </dt>
                <dd className="mt-1.5 font-semibold text-slate-900 space-y-0.5 wrap-break-word">
                  <div>{form.contact_name}</div>
                  <div className="text-xs text-slate-500">{form.contact_email}</div>
                  {form.contact_phone && <div className="text-xs text-slate-500">{form.contact_phone}</div>}
                </dd>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-slate-400" />
                  Schedule Dates
                </dt>
                <dd className="mt-1.5 font-semibold text-slate-900">
                  {form.calendar_date_type === "timed" ? (
                    <div>
                      {form.start_date} to {form.end_date} 
                      <span className="text-xs font-normal text-slate-500 ml-1">(America/New_York)</span>
                    </div>
                  ) : (
                    <div>{form.all_day_start} through {form.all_day_end} <span className="text-xs text-slate-500">(all day)</span></div>
                  )}
                </dd>
              </div>
            </dl>

            {/* Acknowledgements check links */}
            <div className="space-y-3.5 border-t border-slate-200 pt-6">
              <label className="flex items-start gap-3 text-sm text-slate-800 select-none cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={acks.representation} 
                  onChange={(event) => setAcks((value) => ({ ...value, representation: event.target.checked }))} 
                  className="mt-0.5 size-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500" 
                />
                <span className="font-semibold">I am authorized to represent this festival.</span>
              </label>
              
              <label className="flex items-start gap-3 text-sm text-slate-800 select-none cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={acks.accuracy} 
                  onChange={(event) => setAcks((value) => ({ ...value, accuracy: event.target.checked }))} 
                  className="mt-0.5 size-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500" 
                />
                <span className="font-semibold">The information is accurate to the best of my knowledge.</span>
              </label>
              
              <label className="flex items-start gap-3 text-sm text-slate-800 select-none cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={acks.terms} 
                  onChange={(event) => setAcks((value) => ({ ...value, terms: event.target.checked }))} 
                  className="mt-0.5 size-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500" 
                />
                <span className="font-semibold">I agree to the producer submission terms.</span>
              </label>
            </div>
          </CardContent>
          
          <CardFooter className="border-t border-slate-100 bg-slate-50/50 pt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setReviewing(false)} 
              disabled={Boolean(pendingAction)}
              className="font-semibold border-slate-300"
            >
              Edit details
            </Button>
            <Button 
              type="button" 
              onClick={submit} 
              disabled={Boolean(pendingAction)}
              className="font-semibold shadow-xs"
            >
              {pendingAction === "submit" ? "Submitting…" : "Submit for review"}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <form onSubmit={saveDraft} className="space-y-6">
          <fieldset disabled={readOnly || Boolean(pendingAction)} className="space-y-6 disabled:opacity-90">
            
            {/* Festival Details Card */}
            <Card className="shadow-xs border-slate-200 bg-white">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Building className="size-5 text-slate-500" />
                  Festival details
                </CardTitle>
                <CardDescription>Primary festival brand information and address details</CardDescription>
              </CardHeader>
              
              <CardContent className="pt-6 grid gap-5 sm:grid-cols-2">
                <Field id="name" label="Festival name">
                  <input id="name" name="name" value={form.name} onChange={update} maxLength={200} className={inputClass} placeholder="e.g. Philly Craft Beer Festival" />
                </Field>
                <Field id="website_url" label="Website (optional)">
                  <input id="website_url" name="website_url" type="url" value={form.website_url} onChange={update} className={inputClass} placeholder="https://example.com" />
                </Field>
                <div className="sm:col-span-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="description" className={labelClass}>Description</label>
                    <span className="text-xs text-slate-400 font-semibold">(min 20 characters)</span>
                  </div>
                  <textarea id="description" name="description" value={form.description} onChange={update} maxLength={10000} rows={6} className={`${inputClass} min-h-30`} placeholder="Tell us about the attractions, history, and schedule..." />
                </div>
                <div className="sm:col-span-2">
                  <Field id="location" label="Venue or street address">
                    <input id="location" name="location" value={form.location} onChange={update} maxLength={500} className={inputClass} placeholder="e.g. Navy Yard, 4747 S Broad St" />
                  </Field>
                </div>
                <Field id="city" label="City">
                  <input id="city" name="city" value={form.city} onChange={update} maxLength={100} className={inputClass} />
                </Field>
                <Field id="state" label="State">
                  <input id="state" name="state" value={form.state} onChange={update} maxLength={2} className={inputClass} />
                </Field>
                <Field id="zip_code" label="ZIP code">
                  <input id="zip_code" name="zip_code" inputMode="numeric" value={form.zip_code} onChange={update} maxLength={10} className={inputClass} />
                </Field>
              </CardContent>
            </Card>

            {/* Contact Card */}
            <Card className="shadow-xs border-slate-200 bg-white">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Mail className="size-5 text-slate-500" />
                  Private contact
                </CardTitle>
                <CardDescription>Internal contacts for moderation alerts; not shown to the public</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 grid gap-5 sm:grid-cols-2">
                <Field id="contact_name" label="Contact name">
                  <input id="contact_name" name="contact_name" value={form.contact_name} onChange={update} maxLength={200} className={inputClass} />
                </Field>
                <Field id="contact_email" label="Contact email">
                  <input id="contact_email" name="contact_email" type="email" value={form.contact_email} onChange={update} className={inputClass} />
                </Field>
                <Field id="contact_phone" label="Contact phone (optional)">
                  <input id="contact_phone" name="contact_phone" type="tel" value={form.contact_phone} onChange={update} maxLength={40} className={inputClass} />
                </Field>
              </CardContent>
            </Card>

            {/* Dates Card */}
            <Card className="shadow-xs border-slate-200 bg-white">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="size-5 text-slate-500" />
                  Festival dates
                </CardTitle>
                <CardDescription>Specify single or multi-day calendars</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 grid gap-5 sm:grid-cols-2">
                <Field id="calendar_date_type" label="Date type">
                  <select id="calendar_date_type" name="calendar_date_type" value={form.calendar_date_type} onChange={update} className={inputClass}>
                    <option value="timed">Specific start and end times</option>
                    <option value="all_day">All day</option>
                  </select>
                </Field>
                <div className="self-end rounded-lg bg-slate-50 p-4 border border-slate-100 text-xs text-slate-600 font-semibold leading-relaxed">
                  Times are interpreted in America/New_York local time, including daylight saving shifts.
                </div>
                {form.calendar_date_type === "timed" ? (
                  <>
                    <Field id="start_date" label="Start date and time">
                      <input id="start_date" name="start_date" type="datetime-local" value={form.start_date} onChange={update} className={inputClass} />
                    </Field>
                    <Field id="end_date" label="End date and time">
                      <input id="end_date" name="end_date" type="datetime-local" value={form.end_date} onChange={update} className={inputClass} />
                    </Field>
                  </>
                ) : (
                  <>
                    <Field id="all_day_start" label="Start date">
                      <input id="all_day_start" name="all_day_start" type="date" value={form.all_day_start} onChange={update} className={inputClass} />
                    </Field>
                    <Field id="all_day_end" label="End date">
                      <input id="all_day_end" name="all_day_end" type="date" value={form.all_day_end} onChange={update} className={inputClass} />
                    </Field>
                  </>
                )}
              </CardContent>
            </Card>
          </fieldset>

          {!readOnly && (
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button 
                type="submit" 
                variant="outline" 
                disabled={Boolean(pendingAction)} 
                className="font-semibold border-slate-300 bg-white"
              >
                {pendingAction === "save" ? "Saving…" : "Save draft"}
              </Button>
              
              <Button 
                type="button" 
                onClick={review} 
                disabled={Boolean(pendingAction)} 
                className="font-semibold shadow-xs"
              >
                Review submission
              </Button>
            </div>
          )}
        </form>
      )}

      {/* Submission Timeline Card */}
      {(festival.workflow_transitions || []).length > 0 && (
        <Card className="shadow-xs border-slate-200 bg-white">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock className="size-5 text-slate-500" />
              Submission timeline
            </CardTitle>
            <CardDescription>Track state history transitions for this record</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ol className="relative border-l border-slate-200 pl-6 ml-3 space-y-6 text-sm">
              {festival.workflow_transitions.map((item, index) => (
                <li key={item.revision} className="relative">
                  <span className="absolute -left-7.75 top-0.5 flex size-4 items-center justify-center rounded-full bg-slate-200 border-2 border-white ring-2 ring-slate-100">
                    <span className="size-1.5 rounded-full bg-slate-600" />
                  </span>
                  <div className="font-semibold text-slate-950 capitalize flex items-center gap-2">
                    {item.to_state.replaceAll("_", " ")}
                    <span className="text-[10px] text-slate-400 font-mono">Rev {item.revision}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {new Date(item.created_at).toLocaleString()}
                  </div>
                  {item.producer_message && (
                    <p className="mt-1 text-slate-600 bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs leading-relaxed max-w-2xl whitespace-pre-wrap">
                      {item.producer_message}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Private asset uploader card */}
      {!reviewing && (uploadsEnabled ? (
        <AssetUploader festivalId={festival.id} disabled={readOnly} />
      ) : (
        <Card className="shadow-xs border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UploadCloud className="size-5 text-slate-300" />
              Private festival asset
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 leading-normal">
              Image uploads are not currently available. You can save and submit the festival details without an image.
            </p>
          </CardContent>
        </Card>
      ))}

    </div>
  );
}
