"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  Users,
  Music,
  MapPin,
  Plus,
  ArrowRight,
} from "lucide-react";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";

export default function ProducerFestivalsPage() {
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
        <h1 className="text-3xl font-heading font-bold">My Festivals</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent>
        </Card>
      </div>
    );
  }

  if (festivals.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-heading font-bold">My Festivals</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">You haven&apos;t submitted any festivals yet.</p>
            <Link href="/producer/submit">
              <Button><Plus className="mr-2 size-4" />Submit Your First Festival</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-bold">My Festivals</h1>
        <Link href="/producer/submit" className="text-sm text-primary hover:underline">
          + New Submission
        </Link>
      </div>

      <div className="space-y-4">
        {festivals.map((festival) => (
          <Card key={festival.id}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  {festival.image_url && (
                    <Image
                      src={festival.image_url}
                      alt={festival.name}
                      width={64}
                      height={64}
                      unoptimized
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading font-semibold">{festival.name}</h3>
                      <Badge
                        className={`${STATUS_COLORS[festival.status]?.bg} ${STATUS_COLORS[festival.status]?.text}`}
                        variant="outline"
                      >
                        {STATUS_LABELS[festival.status] || festival.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {festival.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {festival.location}, {festival.city}
                        </span>
                      )}
                      {festival.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {new Date(festival.start_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {festival.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {festival.categories.map((cat, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{cat}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="size-3" />
                    {festival.interested} interested
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Music className="size-3" />
                    {festival.scheduleCount} events
                  </div>
                  <Link href={`/festivals/${festival.slug}`} className="text-xs text-primary hover:underline mt-1 inline-block">
                    View Details <ArrowRight className="inline size-3" />
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
