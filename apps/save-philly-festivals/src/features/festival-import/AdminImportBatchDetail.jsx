"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  ShieldAlert, 
  ChevronRight, 
  User, 
  Clock, 
  HelpCircle,
  Eye,
  MessageSquare
} from "lucide-react";

const dispositionConfig = {
  ready: { variant: "outline", className: "bg-slate-50 text-slate-700 border-slate-200", label: "Ready" },
  imported: { variant: "default", className: "bg-green-600 text-white", label: "Imported" },
  duplicate: { variant: "secondary", className: "bg-slate-100 text-slate-500 border-slate-200", label: "Duplicate" },
  quarantined: { variant: "default", className: "bg-amber-500 text-white animate-pulse", label: "Quarantined" },
  failed: { variant: "destructive", className: "bg-red-100 text-red-800 border-red-200", label: "Failed" },
};

const BATCH_STATUS_CONFIG = {
  prepared: { variant: "secondary", className: "bg-amber-100 text-amber-800 border-amber-200", label: "Prepared" },
  running: { variant: "default", className: "bg-blue-500 text-white animate-pulse", label: "Running" },
  completed: { variant: "default", className: "bg-green-600 text-white", label: "Completed" },
  failed: { variant: "destructive", className: "bg-red-100 text-red-800 border-red-200", label: "Failed" },
};

export default function AdminImportBatchDetail({ initialBatch, initialRows = [], pagination, selectedDisposition }) {
  const router = useRouter();
  
  // Dialog triage state
  const [triagingRow, setTriagingRow] = useState(null); // null or row object
  const [reviewReason, setReviewReason] = useState("");
  const [newDisposition, setNewDisposition] = useState("");
  const [triageStatus, setTriageStatus] = useState({ pending: false, error: "", notice: "" });

  async function handleTriageSubmit(e) {
    if (e) e.preventDefault();
    if (!reviewReason.trim()) {
      setTriageStatus({ pending: false, error: "A reason is required to log this triage decision.", notice: "" });
      return;
    }

    setTriageStatus({ pending: true, error: "", notice: "" });
    try {
      const response = await fetch(`/api/admin/imports/rows/${triagingRow.id}/triage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          review_reason: reviewReason,
          disposition: newDisposition || undefined
        })
      });
      const data = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        setTriageStatus({ pending: false, error: data.error || "Failed to submit triage.", notice: "" });
        return;
      }

      setTriageStatus({ pending: false, error: "", notice: "Triage note recorded successfully." });
      setTriagingRow(null);
      setReviewReason("");
      setNewDisposition("");
      
      // Refresh page data
      router.refresh();
    } catch (err) {
      setTriageStatus({ pending: false, error: "Network error occurred.", notice: "" });
    }
  }

  const batchStatus = BATCH_STATUS_CONFIG[initialBatch.status] || { variant: "outline", label: initialBatch.status };

  // Calculate some counts for progress indicators
  const total = initialBatch.total_row_count || 1;
  const importedCount = initialBatch.imported_row_count || 0;
  const quarantinedCount = initialBatch.quarantined_row_count || 0;
  const failedCount = initialBatch.failed_row_count || 0;
  
  const completionPercent = Math.round(((importedCount + failedCount) / total) * 100);

  // Reconciliation checks (based on counts / status)
  const checks = [
    { label: "Row completeness match", description: "All CSV rows parsed and recorded in the database.", ok: initialBatch.total_row_count === (initialBatch.imported_row_count + initialBatch.quarantined_row_count + initialBatch.duplicate_row_count + initialBatch.failed_row_count + initialBatch.ready_row_count) },
    { label: "Duplicate analysis complete", description: "Matches with existing records cataloged.", ok: initialBatch.status !== "failed" },
    { label: "Quarantine clean", description: "Zero records remain quarantined.", ok: quarantinedCount === 0 },
    { label: "Execution successful", description: "Batch ran to completion without terminal failure codes.", ok: initialBatch.status === "completed" },
  ];

  function getDispositionUrl(disposition) {
    const params = new URLSearchParams();
    if (disposition) params.set("disposition", disposition);
    return `/admin/imports/${initialBatch.id}?${params.toString()}`;
  }

  function getPageUrl(page) {
    const params = new URLSearchParams();
    if (selectedDisposition) params.set("disposition", selectedDisposition);
    if (page > 1) params.set("page", String(page));
    return `/admin/imports/${initialBatch.id}?${params.toString()}`;
  }

  return (
    <div className="space-y-8">
      {/* Back button */}
      <div>
        <Link href="/admin/imports" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft className="size-4" /> Back to CSV Imports dashboard
        </Link>
      </div>

      {/* Batch Header info */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-heading font-bold text-slate-900 flex items-center gap-2">
              <Database className="size-8 text-slate-400 shrink-0" />
              {initialBatch.source_name || "Import Batch"}
            </h1>
            <Badge variant={batchStatus.variant} className={`font-semibold border text-xs px-2.5 py-0.5 ${batchStatus.className}`}>
              {batchStatus.label}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-slate-500 max-w-3xl font-mono">
            SHA256: {initialBatch.source_checksum_sha256 || "—"}
          </p>
        </div>
      </div>

      {/* Reconciliation Checklist Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left progress column */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-xs border-slate-200 bg-white h-full">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-900">Ingestion In-Progress</CardTitle>
              <CardDescription>Overall import execution metrics</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div>
                <div className="flex justify-between text-sm font-semibold text-slate-700 mb-1.5">
                  <span>Processed Rows</span>
                  <span>{completionPercent}% ({importedCount + failedCount} / {total})</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-green-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center pt-2">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="text-2xl font-bold text-slate-900">{initialBatch.total_row_count}</div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Total Rows</div>
                </div>
                <div className="p-3 bg-green-50/50 border border-green-100 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">{importedCount}</div>
                  <div className="text-[10px] uppercase font-bold text-green-500 mt-0.5">Imported</div>
                </div>
                <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-lg">
                  <div className="text-2xl font-bold text-amber-700">{quarantinedCount}</div>
                  <div className="text-[10px] uppercase font-bold text-amber-500 mt-0.5">Quarantined</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="text-2xl font-bold text-slate-600">{initialBatch.duplicate_row_count}</div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Duplicates</div>
                </div>
              </div>

              {initialBatch.failure_message && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800">
                  <AlertTriangle className="size-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Failure Diagnostic:</span>
                    {initialBatch.failure_message}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right checklist column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-xs border-slate-200 bg-white h-full">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-900">Reconciliation Checks</CardTitle>
              <CardDescription>Integrity assertions for raw ingestion logs</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4.5">
              {checks.map((check, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-slate-50 hover:bg-slate-50/50 transition-colors">
                  {check.ok ? (
                    <CheckCircle className="size-5 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{check.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{check.description}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Row Filtering tabs */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link 
            href={getDispositionUrl(null)}
            className={`px-4 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
              !selectedDisposition 
                ? "bg-slate-950 border-slate-950 text-white" 
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            All Rows
          </Link>
          {["ready", "imported", "duplicate", "quarantined", "failed"].map((disp) => {
            const config = dispositionConfig[disp] || { label: disp };
            const isSelected = selectedDisposition === disp;
            return (
              <Link 
                key={disp}
                href={getDispositionUrl(disp)}
                className={`px-4 py-1.5 rounded-full border text-xs font-semibold transition-colors capitalize ${
                  isSelected 
                    ? "bg-slate-950 border-slate-950 text-white" 
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {config.label}
              </Link>
            );
          })}
        </div>

        {/* Rows Table */}
        <Card className="shadow-xs border-slate-200 bg-white overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-3xl text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="p-4 pl-6 w-24">Row #</th>
                    <th className="p-4">Disposition</th>
                    <th className="p-4">Issues</th>
                    <th className="p-4">Reconciled Target</th>
                    <th className="p-4">Triage Notes</th>
                    <th className="p-4 pr-6 text-right w-32">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {initialRows.length ? (
                    initialRows.map((row) => {
                      const dispStyle = dispositionConfig[row.disposition] || { variant: "outline", label: row.disposition };
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="p-4 pl-6 font-mono font-bold text-slate-800">
                            #{row.row_number}
                          </td>
                          <td className="p-4">
                            <Badge variant={dispStyle.variant} className={`font-semibold border text-[11px] ${dispStyle.className}`}>
                              {dispStyle.label}
                            </Badge>
                          </td>
                          <td className="p-4 max-w-xs">
                            {row.issues && row.issues.length ? (
                              <div className="space-y-1">
                                {row.issues.map((issue) => (
                                  <div key={issue.id} className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-0.5">
                                    <AlertTriangle className="size-3 text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                      <span className="font-mono font-semibold">{issue.code}:</span> {issue.message}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">No issues</span>
                            )}
                          </td>
                          <td className="p-4">
                            {row.target_festival ? (
                              <Link 
                                href={`/admin/festivals/${row.target_festival.id}`}
                                className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:underline"
                              >
                                {row.target_festival.name}
                                <ExternalLink className="size-3" />
                              </Link>
                            ) : row.matched_festival ? (
                              <div className="text-slate-500 text-xs">
                                Matched Candidate: <span className="font-semibold text-slate-700">{row.matched_festival.name}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                          <td className="p-4 text-xs text-slate-600 max-w-xs truncate" title={row.review_reason}>
                            {row.review_reason ? (
                              <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-slate-700">
                                <MessageSquare className="size-3 text-slate-400 shrink-0" />
                                <span className="truncate">{row.review_reason}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">No triage logs</span>
                            )}
                          </td>
                          <td className="p-4 pr-6 text-right">
                            {row.disposition === "quarantined" ? (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="font-semibold bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:text-amber-800"
                                onClick={() => {
                                  setTriagingRow(row);
                                  setReviewReason(row.review_reason || "");
                                  setNewDisposition(row.disposition);
                                  setTriageStatus({ pending: false, error: "", notice: "" });
                                }}
                              >
                                Triage
                              </Button>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="font-semibold border-slate-200"
                                onClick={() => {
                                  setTriagingRow(row);
                                  setReviewReason(row.review_reason || "");
                                  setNewDisposition(row.disposition);
                                  setTriageStatus({ pending: false, error: "", notice: "" });
                                }}
                              >
                                View / Note
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="p-12 text-center text-slate-500" colSpan={6}>
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <Database className="size-6 text-slate-300" />
                          <div className="text-sm font-semibold text-slate-700">No rows match this filter</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Row Pagination */}
        {pagination && pagination.pages > 1 && (
          <nav aria-label="Import row pages" className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="text-sm text-slate-500">
              Showing Page <span className="font-semibold text-slate-800">{pagination.page}</span> of <span className="font-semibold text-slate-800">{pagination.pages}</span> ({pagination.total} total rows)
            </div>
            <div className="flex items-center gap-2">
              <Link 
                href={getPageUrl(pagination.page - 1)} 
                className={`rounded-lg border px-4 py-1.5 font-ui text-sm font-semibold transition-colors ${
                  pagination.page <= 1 
                    ? "pointer-events-none opacity-40 bg-slate-50 text-slate-400 border-slate-200" 
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Previous
              </Link>
              <Link 
                href={getPageUrl(pagination.page + 1)} 
                className={`rounded-lg border px-4 py-1.5 font-ui text-sm font-semibold transition-colors ${
                  pagination.page >= pagination.pages 
                    ? "pointer-events-none opacity-40 bg-slate-50 text-slate-400 border-slate-200" 
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Next
              </Link>
            </div>
          </nav>
        )}
      </div>

      {/* Triage / Note Dialog Modal */}
      <Dialog open={triagingRow !== null} onOpenChange={() => { if (!triageStatus.pending) setTriagingRow(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold">
              Triage Ingestion Row #{triagingRow?.row_number}
            </DialogTitle>
            <DialogDescription>
              Review validation issues and record triage notes or matching decisions.
            </DialogDescription>
          </DialogHeader>

          {/* Validation Issues summary in dialog */}
          {triagingRow?.issues && triagingRow.issues.length > 0 && (
            <div className="space-y-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <span className="text-xs font-bold text-amber-900 block uppercase tracking-wider">Validation Failures</span>
              {triagingRow.issues.map((issue) => (
                <div key={issue.id} className="text-xs text-amber-800 flex items-start gap-1">
                  <AlertTriangle className="size-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-mono font-semibold">{issue.code}:</span> {issue.message}
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleTriageSubmit} className="space-y-4 py-2">
            {/* Disposition change field (only show ready/quarantined override) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Triage Disposition
              </label>
              <select
                className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                value={newDisposition}
                onChange={(e) => setNewDisposition(e.target.value)}
              >
                <option value="quarantined">Quarantined (Keep flagged for review)</option>
                <option value="ready">Ready (Mark suitable to try import again)</option>
                <option value="imported">Imported (Manually resolved)</option>
                <option value="duplicate">Duplicate (Skip row)</option>
                <option value="failed">Failed (Unusable payload)</option>
              </select>
            </div>

            {/* Note / Reason Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Triage Notes / Decisions <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                className="w-full min-h-22.5 rounded-lg border border-slate-200 p-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                placeholder="Explain the match details, duplicates matched, or reasons for override..."
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                maxLength={1000}
              />
              <span className="text-[11px] text-slate-400 block leading-tight">
                Log critical decision notes for audits. Required to complete triage.
              </span>
            </div>

            {triageStatus.error && (
              <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded border border-red-100">
                {triageStatus.error}
              </p>
            )}

            <DialogFooter className="pt-4 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                disabled={triageStatus.pending}
                onClick={() => setTriagingRow(null)}
                className="font-semibold border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={triageStatus.pending}
                className="font-semibold bg-slate-900 text-white hover:bg-slate-800"
              >
                {triageStatus.pending ? "Saving..." : "Record Decision"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
