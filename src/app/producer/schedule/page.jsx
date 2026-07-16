"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users } from "lucide-react";

export default function ProducerSchedulePage() {
  const [festivals, setFestivals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/producer/stats")
      .then((res) => res.json())
      .then((data) => {
        setFestivals(data.festivals || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-heading font-bold">Schedule</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent>
        </Card>
      </div>
    );
  }

  const festivalsWithSchedules = festivals.filter((f) => f.schedules.length > 0);

  if (festivalsWithSchedules.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-heading font-bold">Schedule</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No schedules yet. Add events to your festivals.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-heading font-bold">Schedule</h1>

      {festivalsWithSchedules.map((festival) => (
        <div key={festival.id} className="space-y-3">
          <h2 className="font-heading font-semibold">{festival.name}</h2>
          <div className="space-y-2">
            {festival.schedules.map((event) => (
              <Card key={event.id}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-[50px]">
                        <Clock className="mx-auto size-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.start_time).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{event.title}</h4>
                          {event.is_headliner && (
                            <Badge className="bg-yellow-100 text-yellow-700 text-xs" variant="secondary">
                              Headliner
                            </Badge>
                          )}
                        </div>
                        {event.performer && (
                          <p className="text-xs text-muted-foreground">{event.performer}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="size-3" />
                      {event.interested}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
