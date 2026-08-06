"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Building2, CalendarDays, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import FestivalReviewDialog from "@/components/admin/FestivalReviewDialog";
import FestivalSubmissionForm from "@/features/festivals/FestivalSubmissionForm";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const TABS = [
  { id: "view", label: "View Festivals" },
  { id: "submit", label: "Submit Festival" },
];

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function FestivalsDashboard({ initialTab = "view" }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [festivals, setFestivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const switchTab = useCallback((tab) => {
    setActiveTab(tab);
    window.history.replaceState(
      null,
      "",
      tab === "submit" ? "/admin/festivals?tab=submit" : "/admin/festivals"
    );
  }, []);

  useEffect(() => {
    let ignore = false;
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      params.set("limit", "100");

      fetch(`/api/festivals?${params.toString()}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch festivals");
          return res.json();
        })
        .then((data) => {
          if (!ignore) setFestivals(data.festivals || []);
        })
        .catch(() => {
          if (!ignore) setError("Failed to load festivals.");
        })
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    }, 300);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [search, status]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Dashboard</p>
          <h1 className="text-3xl font-heading font-bold">Festivals</h1>
          <p className="text-muted-foreground">
            All festival submissions — view, review, and add new festivals
          </p>
        </div>
        <Button onClick={() => switchTab("submit")} className="gap-2">
          <Plus className="size-4" />
          New Festival
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => switchTab(tab.id)}
            aria-pressed={activeTab === tab.id}
            className={cn(
              "rounded-full border px-5 py-2 font-ui text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-primary bg-primary text-white"
                : "border-border bg-background text-foreground hover:border-primary/40 hover:text-primary"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "view" ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search festivals..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value || "all"} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                  Loading...
                </div>
              ) : error ? (
                <div className="px-6 py-12 text-center text-sm text-red-600">
                  {error}
                </div>
              ) : festivals.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                  No festivals match your filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-y text-left text-sm font-medium text-muted-foreground">
                        <th className="px-6 py-3">Name</th>
                        <th className="px-6 py-3">Organization</th>
                        <th className="px-6 py-3">Dates</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Submitted</th>
                        <th className="px-6 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {festivals.map((f) => {
                        const colors = STATUS_COLORS[f.status] || STATUS_COLORS.draft;
                        return (
                          <tr
                            key={f.id}
                            className="border-b last:border-0 hover:bg-muted/50"
                          >
                            <td className="px-6 py-3">
                              <Link
                                href={`/festivals/${f.slug}`}
                                className="font-medium hover:underline"
                              >
                                {f.name}
                              </Link>
                              {f.location && (
                                <p className="text-xs text-muted-foreground">
                                  {f.location}
                                </p>
                              )}
                            </td>
                            <td className="px-6 py-3">
                              {f.organization ? (
                                <Link
                                  href={`/organizations/${f.organization.slug}`}
                                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
                                >
                                  <Building2 className="size-3.5 shrink-0" />
                                  {f.organization.name}
                                </Link>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-3 text-sm text-muted-foreground">
                              {f.start_date ? (
                                <span className="flex items-center gap-1.5">
                                  <CalendarDays className="size-3.5 shrink-0" />
                                  {formatDate(f.start_date)}
                                  {f.end_date &&
                                    f.end_date !== f.start_date &&
                                    ` — ${formatDate(f.end_date)}`}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-6 py-3">
                              <Badge
                                variant="outline"
                                className={`${colors.bg} ${colors.text} border-transparent`}
                              >
                                {STATUS_LABELS[f.status] || f.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-3 text-sm text-muted-foreground">
                              {f.submitted_by || "—"}
                              <p className="text-xs">
                                {new Date(f.created_at).toLocaleDateString()}
                              </p>
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex gap-1">
                                <FestivalReviewDialog festival={f}>
                                  <span className="inline-flex items-center gap-1 text-sm font-medium hover:underline">
                                    Review
                                    <ArrowRight className="size-3.5" />
                                  </span>
                                </FestivalReviewDialog>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <FestivalSubmissionForm />
      )}
    </div>
  );
}
