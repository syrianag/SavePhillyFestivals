"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarWidget } from "@/components/shared/CalendarWidget";
import {
  Calendar,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
} from "lucide-react";

function StatCard({ icon: Icon, label, value, color = "text-primary" }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          <Icon className="mr-1 inline-block size-4" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

export default function ProducerOverviewPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    fetch("/api/producer/stats")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load stats");
        return res.json();
      })
      .then((payload) => {
        setData(payload);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  const festivalsByDay = useMemo(() => {
    const map = new Map();
    if (!data) return map;
    for (const f of data.festivals) {
      if (!f.start_date) continue;
      const start = new Date(f.start_date);
      const end = f.end_date ? new Date(f.end_date) : new Date(f.start_date);
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12);
      let guard = 0;
      while (guard < 370) {
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(f);
        if (d.toDateString() === end.toDateString()) break;
        d.setDate(d.getDate() + 1);
        guard++;
      }
    }
    return map;
  }, [data]);

  const festivalDates = useMemo(() => {
    return [...festivalsByDay.keys()].map((key) => {
      const [year, month, day] = key.split("-").map(Number);
      return new Date(year, month, day, 12).toISOString();
    });
  }, [festivalsByDay]);

  const selectedDayFestivals = useMemo(() => {
    if (!data || !selectedDay) return [];
    const key = `${viewDate.getFullYear()}-${viewDate.getMonth()}-${selectedDay}`;
    return festivalsByDay.get(key) || [];
  }, [data, selectedDay, viewDate, festivalsByDay]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-heading font-bold">Overview</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-heading font-bold">Overview</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="mx-auto mb-3 size-8 text-destructive" />
            <p className="text-muted-foreground mb-4">
              Couldn&apos;t load your dashboard. Please try again.
            </p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const s = data?.stats || { totalFestivals: 0, approvedFestivals: 0, pendingFestivals: 0, draftFestivals: 0, totalInterested: 0, upcomingCount: 0 };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-heading font-bold">Overview</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Calendar} label="Total Festivals" value={s.totalFestivals} />
        <StatCard icon={CheckCircle} label="Approved" value={s.approvedFestivals} color="text-green-600" />
        <StatCard icon={Clock} label="Pending Review" value={s.pendingFestivals} color="text-yellow-600" />
        <StatCard icon={AlertCircle} label="Drafts" value={s.draftFestivals} color="text-gray-600" />
        <StatCard icon={Users} label="Total Interested" value={s.totalInterested} color="text-blue-600" />
        <StatCard icon={Star} label="Upcoming" value={s.upcomingCount} color="text-purple-600" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            <Calendar className="mr-1 inline-block size-4" />
            Festival Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CalendarWidget
            year={viewDate.getFullYear()}
            month={viewDate.getMonth()}
            festivalDates={festivalDates}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            onPrevMonth={() =>
              setViewDate(
                new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)
              )
            }
            onNextMonth={() =>
              setViewDate(
                new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)
              )
            }
          />

          {selectedDayFestivals.length > 0 ? (
            <div className="space-y-2">
              {selectedDayFestivals.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{f.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.location || f.city || "Philadelphia, PA"}
                    </p>
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {f.status}
                  </span>
                </div>
              ))}
            </div>
          ) : selectedDay ? (
            <p className="text-sm text-muted-foreground">
              No festivals on this day.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a day to see which of your festivals are happening.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
