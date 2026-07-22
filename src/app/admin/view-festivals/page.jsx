"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Image from "next/image";
import {
  Plus,
  Trash2,
  Search,
  Calendar,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";
import FestivalReviewDialog from "@/components/admin/FestivalReviewDialog";

export default function AdminViewFestivalsPage() {
  const [festivals, setFestivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  async function handleDelete(id) {
    try {
      const res = await fetch(`/api/festivals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setFestivals((prev) => prev.filter((f) => f.id !== id));
      setDeleteConfirm(null);
    } catch {
      setDeleteConfirm(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/festivals?limit=100");
        const data = await res.json();
        if (!cancelled) setFestivals(data.festivals || []);
      } catch {
        if (!cancelled) setFestivals([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return festivals;
    const q = search.toLowerCase();
    return festivals.filter(
      (f) =>
        f.name?.toLowerCase().includes(q) ||
        f.location?.toLowerCase().includes(q) ||
        f.city?.toLowerCase().includes(q)
    );
  }, [festivals, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold">View Festivals</h1>
          <p className="text-muted-foreground">
            {festivals.length} total festival{festivals.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/admin/submit">
          <Button size="sm">
            <Plus className="mr-1 size-4" />
            Add Festival
          </Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, location, city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading festivals...
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {search ? "No festivals match your search." : "No festivals yet."}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm font-medium text-muted-foreground">
                  <th className="px-4 py-3">Festival</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr
                    key={f.id}
                    className="border-b last:border-0 hover:bg-muted/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {f.image_url ? (
                          <Image
                            src={f.image_url}
                            alt={f.name}
                            width={40}
                            height={40}
                            unoptimized
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-xs font-medium text-muted-foreground">
                            {f.name?.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{f.name}</p>
                          {f.submitted_by && (
                            <p className="text-xs text-muted-foreground">
                              by {f.submitted_by}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="size-3 shrink-0" />
                        {f.location || f.city || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={`${STATUS_COLORS[f.status]?.bg} ${STATUS_COLORS[f.status]?.text}`}
                        variant="outline"
                      >
                        {STATUS_LABELS[f.status] || f.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="size-3 shrink-0" />
                        {f.start_date
                          ? new Date(f.start_date).toLocaleDateString()
                          : f.created_at
                          ? new Date(f.created_at).toLocaleDateString()
                          : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <FestivalReviewDialog festival={f}>
                          <span className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-muted hover:text-foreground transition-colors cursor-pointer">
                            View
                          </span>
                        </FestivalReviewDialog>

                        {deleteConfirm === f.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(f.id)}
                            >
                              Confirm
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirm(f.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
