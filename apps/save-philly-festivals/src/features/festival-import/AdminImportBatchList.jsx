"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { 
  FileSpreadsheet, 
  Calendar, 
  User, 
  ChevronRight, 
  ArrowRight, 
  Database,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw
} from "lucide-react";

const statusConfig = {
  prepared: { variant: "secondary", className: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200/80", label: "Prepared" },
  running: { variant: "default", className: "bg-blue-500 text-white hover:bg-blue-600 animate-pulse", label: "Running" },
  completed: { variant: "default", className: "bg-green-600 text-white hover:bg-green-700", label: "Completed" },
  failed: { variant: "destructive", className: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200/80", label: "Failed" },
};

function pageHref(page) {
  return `/admin/imports?page=${page}`;
}

export default function AdminImportBatchList({ batches = [], pagination }) {
  return (
    <div className="space-y-6">
      {/* Batches Table Card */}
      <Card className="shadow-sm border-slate-200 bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-xl font-heading font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-slate-500" />
            CSV Import Batches
          </CardTitle>
          <CardDescription>Track uploaded and reconciled festival import records.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-240 text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-4 pl-6">Source / Checksum</th>
                  <th className="p-4">Environment</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Counts</th>
                  <th className="p-4">Operator</th>
                  <th className="p-4">Created At</th>
                  <th className="p-4 pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {batches.length ? (
                  batches.map((batch) => {
                    const status = statusConfig[batch.status] || { variant: "outline", label: batch.status };
                    const shortHash = batch.source_checksum_sha256 ? batch.source_checksum_sha256.substring(0, 8) : "—";
                    return (
                      <tr key={batch.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="font-semibold text-slate-950 flex items-center gap-1.5">
                            <Database className="size-4 text-slate-400 shrink-0" />
                            {batch.source_name || "Unnamed Source"}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 font-mono">
                            SHA256: {shortHash}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className="text-xs capitalize font-medium">
                            {batch.environment || "—"}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge variant={status.variant} className={`font-semibold border ${status.className}`}>
                            {status.label}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-800 border border-slate-200" title="Total Rows">
                              T: {batch.total_row_count}
                            </span>
                            {batch.imported_row_count > 0 && (
                              <span className="inline-flex items-center rounded-md bg-green-50 px-1.5 py-0.5 text-xs font-semibold text-green-700 border border-green-200" title="Imported">
                                I: {batch.imported_row_count}
                              </span>
                            )}
                            {batch.quarantined_row_count > 0 && (
                              <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200 animate-pulse" title="Quarantined">
                                Q: {batch.quarantined_row_count}
                              </span>
                            )}
                            {batch.failed_row_count > 0 && (
                              <span className="inline-flex items-center rounded-md bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-700 border border-red-200" title="Failed">
                                F: {batch.failed_row_count}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <User className="size-3.5 text-slate-400" />
                            <span>{batch.operator?.name || batch.operator?.email || "System"}</span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Clock className="size-3.5 text-slate-400" />
                            {new Date(batch.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <Link 
                            href={`/admin/imports/${batch.id}`} 
                            className={buttonVariants({ variant: "outline", size: "sm", className: "font-semibold shadow-xs hover:border-slate-400" })}
                          >
                            Details
                            <ChevronRight className="size-3.5 ml-1" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="p-12 text-center text-slate-500" colSpan={7}>
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Database className="size-8 text-slate-300" />
                        <div className="text-lg font-semibold text-slate-700">No import batches found</div>
                        <p className="text-sm max-w-sm">No CSV spreadsheets have been uploaded for administrative ingestion yet.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <nav aria-label="Import batches pages" className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-sm text-slate-500">
            Showing Page <span className="font-semibold text-slate-800">{pagination.page}</span> of <span className="font-semibold text-slate-800">{pagination.pages}</span> ({pagination.total} total batches)
          </div>
          <div className="flex items-center gap-2">
            <Link 
              href={pageHref(pagination.page - 1)} 
              className={`rounded-lg border px-4 py-1.5 font-ui text-sm font-semibold transition-colors ${
                pagination.page <= 1 
                  ? "pointer-events-none opacity-40 bg-slate-50 text-slate-400 border-slate-200" 
                  : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Previous
            </Link>
            <Link 
              href={pageHref(pagination.page + 1)} 
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
  );
}
