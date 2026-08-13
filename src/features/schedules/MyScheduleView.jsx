"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, MapPin, Users, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function formatEventTime(startTime, endTime) {
  const options = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  const start = startTime ? new Date(startTime).toLocaleString("en-US", options) : "";
  if (!endTime) return start;
  const end = new Date(endTime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${start} - ${end}`;
}

export default function MyScheduleView({ initialEmail }) {
  const [email, setEmail] = useState(initialEmail);
  const [saved, setSaved] = useState(null);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [error, setError] = useState(null);

  async function loadSchedule(e) {
    e?.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/schedules/saved?email=${encodeURIComponent(trimmed)}`);
      if (!res.ok) throw new Error("Couldn't load your schedule. Please try again.");
      const data = await res.json();
      setSaved(data.saved || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function removeItem(scheduleId) {
    const trimmed = email.trim();
    if (!trimmed) return;
    setRemoving(scheduleId);
    setError(null);
    try {
      const res = await fetch("/api/schedules/saved", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, schedule_id: scheduleId }),
      });
      if (!res.ok) throw new Error("Couldn't remove this event. Please try again.");
      setSaved((prev) => prev.filter((item) => item.schedule_id !== scheduleId));
    } catch (err) {
      setError(err.message);
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={loadSchedule} className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="my-schedule-email">Email</Label>
          <Input
            id="my-schedule-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Loading..." : "View My Schedule"}
        </Button>
      </form>

      {error && (
        <Card>
          <CardContent className="py-6 flex items-start gap-3 text-destructive">
            <AlertCircle className="size-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {saved && saved.length === 0 && !error && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No saved events for this email yet.</p>
            <p className="text-sm mt-1">
              Browse festivals and save an event to get started.
            </p>
          </CardContent>
        </Card>
      )}

      {saved && saved.length > 0 && (
        <div className="space-y-3">
          {saved.map((item) => {
            const event = item.schedule;
            const festival = event.festival;
            return (
              <Card key={item.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/festivals/${festival.slug}`}
                          className="text-xs font-semibold uppercase tracking-wide text-primary hover:underline"
                        >
                          {festival.name}
                        </Link>
                        {event.is_headliner && (
                          <Badge className="bg-brand-yellow text-brand-dark text-xs" variant="secondary">
                            Headliner
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-medium leading-tight">{event.title}</h3>
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="size-3" />
                        {formatEventTime(event.start_time, event.end_time)}
                      </p>
                      {event.location && (
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="size-3" />
                          {event.location}
                        </p>
                      )}
                      {event.performer && (
                        <p className="text-sm text-muted-foreground">{event.performer}</p>
                      )}
                      {event.interested != null && (
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Users className="size-3" />
                          {event.interested} interested
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(event.id)}
                      disabled={removing === event.id}
                      aria-label={`Remove ${event.title} from your schedule`}
                    >
                      <Trash2 className="size-4" />
                      {removing === event.id ? "Removing..." : "Remove"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
