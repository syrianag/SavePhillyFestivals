"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Check, X, MapPin, Calendar, Mail, Phone, Globe, Eye } from "lucide-react";

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function SectionHeader({ children }) {
  return (
    <h3 className="text-sm font-semibold text-foreground border-b pb-1 mb-2">
      {children}
    </h3>
  );
}

export default function FestivalReviewDialog({ festival, children }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(null); // "approve" | "reject" | null
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [message, setMessage] = useState(null); // { type: "success" | "error", text: string }

  const statusColors = {
    approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    draft: "bg-gray-100 text-gray-600 border-gray-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
  };

  async function handleStatusChange(status, reason) {
    setLoading(status === "approved" ? "approve" : "reject");
    setMessage(null);
    try {
      const res = await fetch(`/api/festivals/${festival.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason: reason || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to ${status} festival`);
      }
      setMessage({ type: "success", text: `Festival ${status} successfully.` });
      router.refresh();
      setTimeout(() => {
        setOpen(false);
        setMessage(null);
        setShowRejectReason(false);
        setRejectReason("");
      }, 1200);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-1.5 rounded-lg border border-transparent bg-transparent px-2.5 py-1.5 text-sm font-medium hover:bg-muted hover:text-foreground transition-colors">
        {children || (
          <>
            <Eye className="size-3.5" />
            Review
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] pr-12">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <DialogTitle className="text-lg">{festival.name}</DialogTitle>
            <Badge
              variant="outline"
              className={statusColors[festival.status] || statusColors.draft}
            >
              {festival.status}
            </Badge>
          </div>
          {festival.description && (
            <DialogDescription>{festival.description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 max-h-[50vh] overflow-y-auto px-1 pr-3">
          {festival.story && (
            <section>
              <SectionHeader>Story</SectionHeader>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{festival.story}</p>
            </section>
          )}

          {festival.mission && (
            <section>
              <SectionHeader>Mission</SectionHeader>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{festival.mission}</p>
            </section>
          )}

          {festival.history && (
            <section>
              <SectionHeader>History</SectionHeader>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{festival.history}</p>
            </section>
          )}

          <section>
            <SectionHeader>Location</SectionHeader>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4 mt-0.5 shrink-0" />
              <div>
                {festival.location && <p>{festival.location}</p>}
                <p>
                  {[festival.city, festival.state, festival.zip_code]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            </div>
          </section>

          <section>
            <SectionHeader>Dates</SectionHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="size-4 shrink-0" />
              <p>
                {formatDate(festival.start_date)} — {formatDate(festival.end_date)}
              </p>
            </div>
          </section>

          <section>
            <SectionHeader>Contact</SectionHeader>
            <div className="space-y-1 text-sm text-muted-foreground">
              {festival.contact_name && <p>{festival.contact_name}</p>}
              {festival.contact_email && (
                <div className="flex items-center gap-2">
                  <Mail className="size-4 shrink-0" />
                  <a
                    href={`mailto:${festival.contact_email}`}
                    className="underline underline-offset-3 hover:text-foreground"
                  >
                    {festival.contact_email}
                  </a>
                </div>
              )}
              {festival.contact_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="size-4 shrink-0" />
                  <a
                    href={`tel:${festival.contact_phone}`}
                    className="underline underline-offset-3 hover:text-foreground"
                  >
                    {festival.contact_phone}
                  </a>
                </div>
              )}
            </div>
          </section>

          {festival.website_url && (
            <section>
              <SectionHeader>Website</SectionHeader>
              <div className="flex items-center gap-2 text-sm">
                <Globe className="size-4 shrink-0 text-muted-foreground" />
                <a
                  href={festival.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-3 text-primary hover:text-primary/80"
                >
                  {festival.website_url}
                </a>
              </div>
            </section>
          )}

          {festival.image_url && (
            <section>
              <SectionHeader>Image</SectionHeader>
              <Image
                src={festival.image_url}
                alt={festival.name}
                width={448}
                height={256}
                unoptimized
                className="w-full max-w-md rounded-lg border object-cover"
              />
            </section>
          )}

          {festival.categories?.length > 0 && (
            <section>
              <SectionHeader>Categories</SectionHeader>
              <div className="flex flex-wrap gap-1.5">
                {festival.categories.map((cat, i) => (
                  <Badge key={i} variant="secondary">
                    {cat.category?.name || "Unknown"}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {festival.tags?.length > 0 && (
            <section>
              <SectionHeader>Tags</SectionHeader>
              <div className="flex flex-wrap gap-1.5">
                {festival.tags.map((tag, i) => (
                  <Badge key={i} variant="outline">
                    {tag.tag?.name || "Unknown"}
                  </Badge>
                ))}
              </div>
            </section>
          )}
        </div>

        {message && (
          <div
            className={`text-sm px-3 py-2 rounded-md ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {showRejectReason && (
          <div className="space-y-2">
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none resize-none"
            />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                disabled={loading === "reject"}
                onClick={() => handleStatusChange("rejected", rejectReason)}
              >
                <X className="size-3.5" />
                {loading === "reject" ? "Rejecting..." : "Confirm Reject"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowRejectReason(false);
                  setRejectReason("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={loading !== null}
              onClick={() => handleStatusChange("approved")}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Check className="size-3.5" />
              {loading === "approve" ? "Approving..." : "Approve"}
            </Button>
            {!showRejectReason && (
              <Button
                variant="destructive"
                size="sm"
                disabled={loading !== null}
                onClick={() => setShowRejectReason(true)}
              >
                <X className="size-3.5" />
                Reject
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
