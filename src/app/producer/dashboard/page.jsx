"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function PlaceholderCalendar() {
  const [currentDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = currentDate.getDate();
  const isCurrentMonth = currentDate.getMonth() === month && currentDate.getFullYear() === year;

  const blanks = Array.from({ length: firstDay }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="rounded-md p-1 hover:bg-muted transition-colors">
            <ChevronLeft className="size-4" />
          </button>
          <CardTitle className="text-sm font-medium">
            {MONTHS[month]} {year}
          </CardTitle>
          <button onClick={nextMonth} className="rounded-md p-1 hover:bg-muted transition-colors">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center">
          {DAYS.map((day) => (
            <div key={day} className="text-xs font-medium text-muted-foreground py-1">
              {day}
            </div>
          ))}
          {blanks.map((b) => (
            <div key={`blank-${b}`} />
          ))}
          {days.map((day) => (
            <div
              key={day}
              className={`text-sm py-1.5 rounded-md ${
                isCurrentMonth && day === today
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              {day}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground text-center">
          Calendar coming soon — events will appear here
        </p>
      </CardContent>
    </Card>
  );
}

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
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/producer/stats")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load stats");
        return res.json();
      })
      .then((data) => {
        setStats(data.stats);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

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

  const s = stats || { totalFestivals: 0, approvedFestivals: 0, pendingFestivals: 0, draftFestivals: 0, totalInterested: 0, upcomingCount: 0 };

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

      <PlaceholderCalendar />
    </div>
  );
}
