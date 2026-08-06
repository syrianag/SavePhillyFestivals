"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  Calendar, 
  User, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  FileText, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  History, 
  Mail, 
  Phone, 
  ExternalLink, 
  ChevronLeft, 
  RefreshCw, 
  ShieldAlert,
  Send,
  Sparkles
} from "lucide-react";

const label = (value) => value?.replaceAll("_", " ") || "—";

const stateBadgeMap = {
  draft: { variant: "outline", className: "bg-slate-50 text-slate-700 border-slate-200", label: "Draft" },
  pending_review: { variant: "default", className: "bg-amber-500 text-white hover:bg-amber-600", label: "Pending Review" },
  changes_requested: { variant: "secondary", className: "bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200", label: "Changes Requested" },
  approved: { variant: "secondary", className: "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200", label: "Approved" },
  rejected: { variant: "destructive", className: "bg-red-100 text-red-800 hover:bg-red-200 border-red-200", label: "Rejected" },
  published: { variant: "default", className: "bg-green-600 text-white hover:bg-green-700", label: "Published" },
  unpublished: { variant: "outline", className: "bg-zinc-100 text-zinc-700 border-zinc-200", label: "Unpublished" },
  canceled: { variant: "destructive", className: "bg-rose-500 text-white hover:bg-rose-600", label: "Canceled" },
  archived: { variant: "outline", className: "bg-slate-100 text-slate-500 border-slate-200", label: "Archived" },
};

const ACTION_LABELS = {
  pending_review: "Submit for Review",
  changes_requested: "Request Changes",
  approved: "Approve",
  rejected: "Reject",
  published: "Publish",
  unpublished: "Unpublish",
  canceled: "Cancel Festival",
  archived: "Archive",
  draft: "Revert to Draft",
};

const ACTION_VARIANTS = {
  approved: "default",
  published: "default",
  pending_review: "secondary",
  draft: "secondary",
  unpublished: "outline",
  archived: "outline",
  changes_requested: "secondary",
  rejected: "destructive",
  canceled: "destructive",
};

const ACTION_BUTTON_CLASSES = {
  approved: "bg-blue-600 text-white hover:bg-blue-700",
  published: "bg-green-600 text-white hover:bg-green-700",
  changes_requested: "bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200",
  rejected: "bg-red-50 text-red-700 hover:bg-red-100 border-red-200",
  canceled: "bg-rose-600 text-white hover:bg-rose-700",
};

export default function AdminFestivalDetail({ initialFestival }) {
  const router = useRouter();
  const [festival, setFestival] = useState(initialFestival);
  
  // Transition Form state
  const [activeDialog, setActiveDialog] = useState(null); // null or transition action state
  const [reason, setReason] = useState("");
  const [producerMessage, setProducerMessage] = useState("");
  const [publicMessage, setPublicMessage] = useState("");
  
  const [status, setStatus] = useState({ pending: false, error: "", notice: "" });

  const isConflict = status.error && status.error.includes("Revision conflict");

  async function handleTransitionSubmit(event) {
    if (event) event.preventDefault();
    
    // Validation
    if ((activeDialog === "changes_requested" || activeDialog === "rejected") && !producerMessage.trim()) {
      setStatus((s) => ({ ...s, error: "Producer message is required for this action." }));
      return;
    }
    if (activeDialog === "canceled" && !publicMessage.trim()) {
      setStatus((s) => ({ ...s, error: "Public cancellation message is required." }));
      return;
    }

    setStatus({ pending: true, error: "", notice: "" });
    const payload = { expected_revision: festival.revision, to_state: activeDialog };
    if (reason.trim()) payload.reason = reason.trim();
    if (producerMessage.trim()) payload.producer_message = producerMessage.trim();
    if (publicMessage.trim()) payload.public_message = publicMessage.trim();

    try {
      const response = await fetch(`/api/admin/festivals/${encodeURIComponent(festival.id)}/transitions`, { 
        method: "POST", 
        headers: { "content-type": "application/json" }, 
        body: JSON.stringify(payload) 
      });
      const body = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        setStatus({ 
          pending: false, 
          error: response.status === 409 ? "Revision conflict. Reload before taking another action." : body.error || "Transition failed.", 
          notice: "" 
        });
        return;
      }
      
      setFestival((current) => ({ ...current, ...body.festival, valid_actions: [] }));
      setStatus({ 
        pending: false, 
        error: "", 
        notice: `Festival moved to ${label(body.festival.workflow_state)}. Notification ${body.notification?.sent ? "sent" : "recorded for follow-up"}.` 
      });
      setActiveDialog(null);
      setReason("");
      setProducerMessage("");
      setPublicMessage("");
      router.refresh();
    } catch (err) {
      setStatus({ pending: false, error: "Network error occurred.", notice: "" });
    }
  }

  async function retryNotification(notification) {
    setStatus({ pending: true, error: "", notice: "" });
    try {
      const response = await fetch(`/api/admin/festivals/${encodeURIComponent(festival.id)}/notifications/${encodeURIComponent(notification.id)}/retry`, { 
        method: "POST" 
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus({ pending: false, error: body.error || "Notification retry failed.", notice: "" });
        return;
      }
      const delivery = body.notification || {};
      setStatus({ 
        pending: false, 
        error: "", 
        notice: delivery.sent ? "Notification sent." : `Notification remains ${label(delivery.delivery_status)} and is safe to retry.` 
      });
      router.refresh();
    } catch (err) {
      setStatus({ pending: false, error: "Failed to retry notification.", notice: "" });
    }
  }

  async function reviewAsset(asset, decision) {
    setStatus({ pending: true, error: "", notice: "" });
    try {
      const response = await fetch(`/api/admin/festivals/${festival.id}/assets`, { 
        method: "POST", 
        headers: { "content-type": "application/json" }, 
        body: JSON.stringify({ 
          expected_festival_revision: festival.revision, 
          asset_id: asset.id, 
          decision, 
          ...(decision === "rejected" ? { reason: "Asset is not suitable for publication." } : {}) 
        }) 
      });
      const body = await response.json().catch(() => ({}));
      setStatus(response.ok ? { pending: false, error: "", notice: `Asset ${decision}.` } : { pending: false, error: body.error || "Asset review failed.", notice: "" });
      if (response.ok) router.refresh();
    } catch (err) {
      setStatus({ pending: false, error: "Asset review failed.", notice: "" });
    }
  }

  const currentBadge = stateBadgeMap[festival.workflow_state] || { variant: "outline", label: festival.workflow_state };

  return (
    <div className="space-y-8">
      {/* Back link & Top Header */}
      <div className="flex flex-col gap-4">
        <div>
          <Link href="/admin/festivals" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
            <ChevronLeft className="size-4" /> Back to Editorial list
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-heading font-bold text-slate-900">
                {festival.name || "Untitled Festival"}
              </h1>
              <Badge variant={currentBadge.variant} className={`font-semibold border text-sm px-3 py-0.5 ${currentBadge.className}`}>
                {currentBadge.label}
              </Badge>
              <Badge variant="outline" className="text-slate-500 font-medium text-xs px-2 py-0.5">
                Rev {festival.revision}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Private editorial record. Contact details and internal editor logs are kept strictly internal.
            </p>
          </div>
        </div>
      </div>

      {/* Recoverable Conflict State */}
      {isConflict && (
        <Card className="border-red-200 bg-red-50/50 shadow-xs">
          <CardHeader className="flex flex-row items-center gap-3 pb-3">
            <ShieldAlert className="size-6 text-red-600 shrink-0" />
            <div>
              <CardTitle className="text-red-950 font-bold">Revision Conflict Detected</CardTitle>
              <CardDescription className="text-red-700">
                This festival details have been modified by another process or editor since you loaded this page.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-red-800">
            To prevent overwriting other editorial modifications, please reload this page to pull the latest state before attempting transitions.
          </CardContent>
          <CardFooter className="pt-0">
            <Button onClick={() => window.location.reload()} variant="destructive" className="font-semibold">
              <RefreshCw className="size-4 mr-1.5 animate-spin-reverse" />
              Reload Page State
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Action / Notice Banner */}
      {!isConflict && status.error && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-xs">
          <AlertTriangle className="size-5 text-red-600 shrink-0 mt-0.5" />
          <div className="font-medium">{status.error}</div>
        </div>
      )}
      {status.notice && (
        <div role="status" className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 shadow-xs">
          <CheckCircle className="size-5 text-green-600 shrink-0 mt-0.5" />
          <div className="font-medium">{status.notice}</div>
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns (Submission details & assets) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Submission Detail Card */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="size-5 text-slate-500" />
                Submission details
              </CardTitle>
              <CardDescription>Main festival description, slug, and details</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Festival Name</h4>
                  <p className="mt-1.5 text-sm font-semibold text-slate-900">{festival.name || "—"}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Festival URL Slug</h4>
                  <p className="mt-1.5 text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-100 rounded-md px-2 py-0.5 w-fit">
                    /{festival.slug || "—"}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</h4>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                  {festival.description || "—"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Dates & Occurrences Card */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="size-5 text-slate-500" />
                Dates & Occurrences
              </CardTitle>
              <CardDescription>Primary dates and individual scheduled time slots</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">General Date Range</h4>
                  <p className="mt-1.5 text-sm font-semibold text-slate-800 flex items-center gap-2">
                    {festival.start_date ? new Date(festival.start_date).toLocaleDateString() : "—"}
                    <ArrowRight className="size-3 text-slate-400" />
                    {festival.end_date ? new Date(festival.end_date).toLocaleDateString() : "—"}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Time Zone</h4>
                  <p className="mt-1.5 text-sm font-medium text-slate-600">{festival.time_zone || "America/New_York"}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Occurrences</h4>
                <div className="space-y-3">
                  {festival.occurrences && festival.occurrences.length ? (
                    festival.occurrences.map((occ) => (
                      <div key={occ.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 text-sm gap-2">
                        <div className="flex items-center gap-2.5">
                          <Clock className="size-4 text-slate-400" />
                          <span className="font-semibold text-slate-700">
                            {occ.start_at ? new Date(occ.start_at).toLocaleString() : "—"} to{" "}
                            {occ.end_at ? new Date(occ.end_at).toLocaleString() : "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {occ.is_primary && (
                            <Badge variant="default" className="bg-slate-800 text-white text-xs">Primary</Badge>
                          )}
                          <Badge variant="outline" className="text-xs bg-white text-slate-500">
                            {label(occ.calendar_status)}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 italic">No specific occurrences defined.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Private Contact Card - Marked Clearly Internal/Private */}
          <Card className="shadow-xs border-amber-200 bg-amber-50/10 relative overflow-hidden">
            {/* Warning tag ribbon */}
            <div className="absolute top-0 right-0 bg-amber-500 text-white font-bold text-[9px] uppercase px-3 py-1 rounded-bl-lg tracking-wider flex items-center gap-1">
              <ShieldAlert className="size-3" /> INTERNAL USE ONLY
            </div>
            
            <CardHeader className="border-b border-amber-100">
              <CardTitle className="text-lg font-bold text-amber-900 flex items-center gap-2">
                <User className="size-5 text-amber-600" />
                Private contact details
              </CardTitle>
              <CardDescription className="text-amber-700">Information submitted by the producer for coordinator correspondence.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider">Contact Name</h4>
                <p className="mt-1.5 text-sm font-semibold text-slate-900">{festival.contact_name || "—"}</p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
                  <Mail className="size-3.5" /> Contact Email
                </h4>
                <p className="mt-1.5 text-sm font-semibold text-slate-800">
                  {festival.contact_email ? (
                    <a href={`mailto:${festival.contact_email}`} className="text-blue-600 hover:underline">
                      {festival.contact_email}
                    </a>
                  ) : "—"}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
                  <Phone className="size-3.5" /> Contact Phone
                </h4>
                <p className="mt-1.5 text-sm font-semibold text-slate-900">{festival.contact_phone || "—"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Private Assets Card */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="size-5 text-slate-500" />
                Private assets
              </CardTitle>
              <CardDescription>Review uploaded logos, flyers, and other attachments</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {festival.private_assets && festival.private_assets.length ? (
                festival.private_assets.map((asset) => {
                  const isPending = asset.editorial_status === "pending";
                  return (
                    <div key={asset.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3 hover:border-slate-200 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            <span className="capitalize">{label(asset.purpose)}</span>
                            <span className="text-xs text-slate-400 font-normal">({asset.original_filename})</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Alt text: &ldquo;{asset.alt_text || "—"}&rdquo;
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="text-xs bg-white border-slate-200">
                            Scan: {label(asset.scan_status)}
                          </Badge>
                          <Badge variant="outline" className={`text-xs bg-white border-slate-200 ${asset.editorial_status === 'approved' ? 'text-green-600 border-green-200 bg-green-50' : asset.editorial_status === 'rejected' ? 'text-red-600 border-red-200 bg-red-50' : 'text-amber-600 border-amber-200 bg-amber-50'}`}>
                            Editorial: {label(asset.editorial_status)}
                          </Badge>
                        </div>
                      </div>
                      
                      {isPending && (
                        <div className="flex gap-2 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                            onClick={() => reviewAsset(asset, "approved")}
                          >
                            Approve asset
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                            onClick={() => reviewAsset(asset, "rejected")}
                          >
                            Reject asset
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500 italic text-center py-6">No private assets submitted.</p>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right Column (Editorial controls & timeline) */}
        <div className="space-y-8">
          
          {/* Editorial Actions Control Panel */}
          {!isConflict && festival.valid_actions && festival.valid_actions.length > 0 && (
            <Card className="shadow-xs border-slate-900 bg-slate-900 text-white overflow-hidden">
              <CardHeader className="border-b border-slate-800 bg-slate-950/40">
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="size-5 text-amber-400" />
                  Editorial Action
                </CardTitle>
                <CardDescription className="text-slate-400">Apply state transitions to this festival submission</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-3">
                <div className="flex flex-col gap-2">
                  {festival.valid_actions.map((act) => {
                    const labelStr = ACTION_LABELS[act] || label(act);
                    const variant = ACTION_VARIANTS[act] || "outline";
                    const customClass = ACTION_BUTTON_CLASSES[act] || "";
                    return (
                      <Button
                        key={act}
                        variant={variant}
                        className={`w-full font-semibold justify-start ${customClass}`}
                        onClick={() => {
                          setActiveDialog(act);
                          setReason("");
                          setProducerMessage("");
                          setPublicMessage("");
                        }}
                      >
                        <ArrowRight className="size-4 mr-2" />
                        {labelStr}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline Card */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <History className="size-5 text-slate-500" />
                Audit timeline
              </CardTitle>
              <CardDescription>Chronological transition logs of the workflow</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {festival.workflow_transitions && festival.workflow_transitions.length ? (
                <div className="relative border-l border-slate-200 pl-4 space-y-6">
                  {festival.workflow_transitions.map((item) => (
                    <div key={item.id} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-5.25 top-1.5 size-2.5 rounded-full border-2 border-white bg-slate-400 ring-4 ring-slate-100" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800 capitalize">
                            {label(item.from_state)} → {label(item.to_state)}
                          </span>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium text-slate-500">
                            Rev {item.revision}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(item.created_at).toLocaleString()}
                        </p>
                        
                        {item.reason && (
                          <div className="mt-2 text-xs bg-slate-50 p-2 rounded border border-slate-100 text-slate-600">
                            <span className="font-semibold text-slate-800">Internal Note:</span> {item.reason}
                          </div>
                        )}
                        {item.producer_message && (
                          <div className="mt-1.5 text-xs bg-purple-50/50 p-2 rounded border border-purple-100 text-purple-800">
                            <span className="font-semibold text-purple-900">To Producer:</span> {item.producer_message}
                          </div>
                        )}
                        {item.public_message && (
                          <div className="mt-1.5 text-xs bg-rose-50/50 p-2 rounded border border-rose-100 text-rose-800">
                            <span className="font-semibold text-rose-900">Public Note:</span> {item.public_message}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic text-center py-6">No transitions recorded.</p>
              )}
            </CardContent>
          </Card>

          {/* Notifications attempts Card */}
          <Card className="shadow-xs border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Mail className="size-5 text-slate-500" />
                Notification attempts
              </CardTitle>
              <CardDescription>Resend delivery statuses to the producer</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {festival.workflow_notifications && festival.workflow_notifications.length ? (
                <div className="space-y-3">
                  {festival.workflow_notifications.map((item) => {
                    const retryNeeded = item.delivery_status === "pending" || (item.delivery_status === "failed" && item.attempts < 5);
                    return (
                      <div key={item.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 text-sm flex flex-col gap-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-semibold text-slate-700">Revision {item.workflow_revision}</span>
                            <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                              <span>Status: <span className="font-medium capitalize">{label(item.delivery_status)}</span> · Attempts: {item.attempts}/5</span>
                              {retryNeeded && (
                                <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                                  Retry needed
                                </span>
                              )}
                            </div>
                            {item.failure_code && (
                              <div className="text-xs font-semibold text-red-600 mt-1">
                                Error: {item.failure_code}
                              </div>
                            )}
                          </div>
                          <Badge variant="outline" className={`text-xs bg-white ${item.delivery_status === 'sent' ? 'text-green-600 border-green-200' : 'text-amber-600 border-amber-200'}`}>
                            {label(item.delivery_status)}
                          </Badge>
                        </div>
                        {retryNeeded && (
                          <div>
                            <Button
                              type="button"
                              disabled={status.pending}
                              size="sm"
                              variant="outline"
                              className="font-semibold w-full"
                              onClick={() => retryNotification(item)}
                            >
                              <Send className="size-3.5 mr-1" />
                              Retry notification
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic text-center py-6">No notifications recorded.</p>
              )}
            </CardContent>
          </Card>

        </div>

      </div>

      {/* Transition Dialog Modal */}
      <Dialog open={activeDialog !== null} onOpenChange={() => { if (!status.pending) setActiveDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold capitalize">
              {activeDialog ? ACTION_LABELS[activeDialog] || label(activeDialog) : ""}
            </DialogTitle>
            <DialogDescription>
              Provide the details below to advance this festival to the &ldquo;{activeDialog ? label(activeDialog) : ""}&rdquo; state.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleTransitionSubmit} className="space-y-4 py-2">
            {/* Producer Message (required for changes_requested and rejected) */}
            {(activeDialog === "changes_requested" || activeDialog === "rejected") && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Producer Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  className="w-full min-h-22.5 rounded-lg border border-slate-200 p-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  placeholder="Clearly explain what needs to be fixed or why the submission is rejected..."
                  value={producerMessage}
                  onChange={(e) => setProducerMessage(e.target.value)}
                  maxLength={2000}
                />
                <span className="text-[11px] text-slate-400 block leading-tight">
                  This message is sent directly to the producer and must be safe for them to read.
                </span>
              </div>
            )}

            {/* Public Cancellation Message (required for canceled) */}
            {activeDialog === "canceled" && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Public Cancellation Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  className="w-full min-h-22.5 rounded-lg border border-slate-200 p-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  placeholder="Explain why this festival was canceled (this will be displayed to public visitors)..."
                  value={publicMessage}
                  onChange={(e) => setPublicMessage(e.target.value)}
                  maxLength={1000}
                />
                <span className="text-[11px] text-slate-400 block leading-tight">
                  This cancellation tombstone message is rendered on the public website.
                </span>
              </div>
            )}

            {/* Internal Reason (Optional, private to editors) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Internal Reason <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                className="w-full min-h-17.5 rounded-lg border border-slate-200 p-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                placeholder="Log internal comments or notes about this action..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={2000}
              />
              <span className="text-[11px] text-slate-400 block leading-tight">
                For administrative records only. Never shown to producers or visitors.
              </span>
            </div>

            <DialogFooter className="pt-4 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                disabled={status.pending}
                onClick={() => setActiveDialog(null)}
                className="font-semibold border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={status.pending}
                className={`font-semibold ${activeDialog ? ACTION_BUTTON_CLASSES[activeDialog] || "" : ""}`}
              >
                {status.pending ? "Processing..." : `Confirm ${activeDialog ? label(activeDialog) : ""}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
