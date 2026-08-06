import { notFound } from "next/navigation";
import { getFestivalBySlug } from "@/features/festivals/festival-queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import {
  Calendar,
  MapPin,
  Globe,
  Mail,
  Phone,
  Clock,
  Tag,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

function formatDate(dateStr) {
  if (!dateStr) return "TBD";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function FestivalDetailPage({ params }) {
  const { slug } = await params;
  const festival = await getFestivalBySlug(slug);

  if (!festival) {
    notFound();
  }

  const categories = festival.categories?.map((c) => c.category?.name).filter(Boolean) || [];
  const tags = festival.tags?.map((t) => t.tag?.name).filter(Boolean) || [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="size-4" />
        Back to Festivals
      </Link>

      {festival.image_url && (
        <div className="relative mb-8 aspect-[21/9] overflow-hidden rounded-2xl">
          <Image
            src={festival.image_url}
            alt={festival.name}
            fill
            priority
            className="object-cover"
          />
        </div>
      )}

      <div className="space-y-8">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            {categories.map((cat) => (
              <Badge key={cat} variant="secondary">
                {cat}
              </Badge>
            ))}
          </div>
          <h1 className="text-4xl font-heading font-bold mb-2">
            {festival.name}
          </h1>
          {festival.description && (
            <p className="text-lg text-muted-foreground">
              {festival.description}
            </p>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                <Calendar className="mr-1 inline-block size-4" />
                Dates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{formatDate(festival.start_date)}</p>
              {festival.end_date && (
                <p className="text-sm text-muted-foreground">
                  to {formatDate(festival.end_date)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                <MapPin className="mr-1 inline-block size-4" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              {festival.location && <p className="font-medium">{festival.location}</p>}
              <p className="text-sm text-muted-foreground">
                {[festival.city, festival.state, festival.zip_code]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                <Mail className="mr-1 inline-block size-4" />
                Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {festival.contact_name && (
                <p className="font-medium">{festival.contact_name}</p>
              )}
              {festival.contact_email && (
                <a
                  href={`mailto:${festival.contact_email}`}
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <Mail className="size-3" />
                  {festival.contact_email}
                </a>
              )}
              {festival.contact_phone && (
                <a
                  href={`tel:${festival.contact_phone}`}
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <Phone className="size-3" />
                  {festival.contact_phone}
                </a>
              )}
            </CardContent>
          </Card>
        </div>

        {festival.website_url && (
          <a
            href={festival.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <Globe className="size-4" />
            Visit Website
          </a>
        )}

        {(festival.story || festival.mission || festival.history) && (
          <div className="space-y-6">
            {festival.story && (
              <section>
                <h2 className="text-xl font-heading font-semibold mb-2">Our Story</h2>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {festival.story}
                </p>
              </section>
            )}
            {festival.mission && (
              <section>
                <h2 className="text-xl font-heading font-semibold mb-2">Mission</h2>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {festival.mission}
                </p>
              </section>
            )}
            {festival.history && (
              <section>
                <h2 className="text-xl font-heading font-semibold mb-2">History</h2>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {festival.history}
                </p>
              </section>
            )}
          </div>
        )}

        {tags.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              <Tag className="mr-1 inline-block size-3" />
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {festival.schedules?.length > 0 ? (
          <section>
            <h2 className="text-xl font-heading font-semibold mb-4">Schedule</h2>
            <div className="space-y-3">
              {festival.schedules.map((event) => (
                <Card key={event.id}>
                  <CardContent className="flex items-start gap-4 py-4">
                    <div className="shrink-0 text-center min-w-[60px]">
                      <Clock className="mx-auto size-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(event.start_time)}
                      </p>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{event.title}</h4>
                        {event.is_headliner && (
                          <Badge className="bg-brand-yellow text-brand-dark" variant="secondary">
                            Headliner
                          </Badge>
                        )}
                      </div>
                      {event.performer && (
                        <p className="text-sm text-muted-foreground">
                          {event.performer}
                        </p>
                      )}
                      {event.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ) : (
          <section>
            <h2 className="text-xl font-heading font-semibold mb-4">Schedule</h2>
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No schedule listed yet. Check back closer to the event date.
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </div>
  );
}
