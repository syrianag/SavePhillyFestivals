import { cache } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  Globe,
  ImageIcon,
  MapPin,
  Tag,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublicFestivalBySlug } from "@/features/festivals/festival-queries";
import { ScheduleSaveButton } from "@/features/schedule/ScheduleSaveButton";
import PublicSocialFeed from "@/features/social-feed/PublicSocialFeed";
import { socialFeedE2ERepository } from "@/features/social-feed/social-feed-e2e-fixture";
import { socialFeedRepository } from "@/features/social-feed/social-feed-repository";
import { getPublicSocialFeed } from "@/features/social-feed/social-feed-service";
import {
  formatPhiladelphiaDate,
  formatPhiladelphiaTime,
} from "@/features/festivals/public-festival";

const getFestival = cache(getPublicFestivalBySlug);

function getCanonicalUrl(slug) {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;
  if (!configuredUrl) return null;

  try {
    const base = new URL(configuredUrl.includes("://") ? configuredUrl : `https://${configuredUrl}`);
    return new URL(`/festivals/${encodeURIComponent(slug)}`, base).toString();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const festival = await getFestival(slug);

  if (!festival) {
    return { title: "Festival not found | Save Philly Festivals" };
  }

  const canonical = getCanonicalUrl(festival.slug);
  return {
    title: `${festival.name} | Save Philly Festivals`,
    description: festival.description,
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      title: festival.name,
      description: festival.description,
      type: "website",
      ...(canonical ? { url: canonical } : {}),
      ...(festival.image_url ? { images: [{ url: festival.image_url, alt: festival.name }] } : {}),
    },
  };
}

export default async function FestivalDetailPage({ params }) {
  const { slug } = await params;
  const festival = await getFestival(slug);

  if (!festival) notFound();
  const socialFeed = festival.canceled
    ? null
    : await getPublicSocialFeed(festival.id, { repository: socialFeedE2ERepository() || socialFeedRepository });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:py-12">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 font-ui text-sm text-[#848484] transition-colors hover:text-black"
      >
        <ArrowLeft className="size-4" />
        Back to Festivals
      </Link>

      {festival.canceled && (
        <section role="status" data-testid="cancellation-tombstone" className="mb-8 rounded-2xl border-2 border-red-700 bg-red-50 p-6 text-red-950">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 size-6 shrink-0" aria-hidden="true" />
            <div><p className="font-ui text-sm font-bold uppercase tracking-wide">Canceled</p><h1 className="mt-1 font-heading text-2xl font-bold">This festival has been canceled</h1><p className="mt-2 font-body text-lg">{festival.public_message}</p></div>
          </div>
        </section>
      )}

      {festival.image_url ? (
        <div className="relative mb-8 aspect-[21/9] overflow-hidden rounded-2xl bg-[#E8E6E1]">
          <Image
            src={festival.image_url}
            alt={`${festival.name} festival`}
            fill
            priority
            unoptimized
            className="object-cover"
          />
        </div>
      ) : (
        <div
          data-testid="festival-image-fallback"
          className="mb-8 flex aspect-[21/9] items-center justify-center rounded-2xl bg-gradient-to-br from-brand-light-teal to-brand-teal text-white"
        >
          <div className="text-center">
            <ImageIcon className="mx-auto size-8" aria-hidden="true" />
            <p className="mt-2 font-ui text-sm">Festival photo coming soon</p>
          </div>
        </div>
      )}

      <div className="space-y-8">
        <header>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {festival.categories.length ? (
              festival.categories.map((category) => (
                <Badge key={category.slug || category.name} variant="secondary">
                  {category.name}
                </Badge>
              ))
            ) : (
              <span className="font-ui text-sm text-[#848484]">Category to be announced</span>
            )}
          </div>
          <h1 className="font-heading text-4xl font-bold text-black md:text-5xl">
            {festival.name}
          </h1>
          <p className="mt-3 font-body text-lg leading-relaxed text-[#45556C]">
            {festival.description}
          </p>
          {!festival.canceled && <div className="mt-5">
            <ScheduleSaveButton
              type="festival"
              id={festival.id}
              name={festival.name}
            />
          </div>}
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#848484]">
                <Calendar className="mr-1 inline-block size-4" /> Dates &amp; times
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{festival.dateLabel}</p>
              {festival.endDateLabel && (
                <p className="mt-1 text-sm text-[#848484]">through {festival.endDateLabel}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#848484]">
                <MapPin className="mr-1 inline-block size-4" /> Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{festival.locationLabel}</p>
              <p className="mt-1 text-sm text-[#848484]">{festival.addressLabel}</p>
            </CardContent>
          </Card>
        </div>

        {!festival.canceled && (festival.website_url ? (
          <a
            href={festival.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-ui font-medium text-[#1E7BF6] hover:underline"
          >
            <Globe className="size-4" /> Visit official website
          </a>
        ) : (
          <p className="font-ui text-sm text-[#848484]">Official website coming soon</p>
        ))}

        {!festival.canceled && <section aria-labelledby="official-social-heading">
          <h2 id="official-social-heading" className="font-heading text-xl font-semibold">
            Official social channels
          </h2>
          {festival.socialLinks.length ? (
            <div className="mt-3 flex flex-wrap gap-3">
              {festival.socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[#EBEBEB] px-4 py-2 font-ui text-sm font-medium text-black transition-colors hover:bg-[#D9D9D9]"
                >
                  {social.label} <ExternalLink className="size-3" aria-hidden="true" />
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[#848484]">No official social channels listed.</p>
          )}
        </section>}

        {!festival.canceled && <PublicSocialFeed feed={socialFeed} />}

        {(festival.story || festival.mission || festival.history) && (
          <div className="space-y-6">
            {[
              ["Our Story", festival.story],
              ["Mission", festival.mission],
              ["History", festival.history],
            ].map(([heading, copy]) =>
              copy ? (
                <section key={heading}>
                  <h2 className="font-heading text-xl font-semibold">{heading}</h2>
                  <p className="mt-2 whitespace-pre-wrap font-body leading-relaxed text-[#45556C]">
                    {copy}
                  </p>
                </section>
              ) : null
            )}
          </div>
        )}

        <section aria-labelledby="tags-heading">
          <h2 id="tags-heading" className="text-sm font-medium text-[#848484]">
            <Tag className="mr-1 inline-block size-3" /> Tags
          </h2>
          {festival.tags.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {festival.tags.map((tag) => (
                <Badge key={tag.slug || tag.name} variant="outline">
                  {tag.name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[#848484]">Tags to be announced</p>
          )}
        </section>

        <section aria-labelledby="program-heading">
          <h2 id="program-heading" className="font-heading text-2xl font-semibold">
            Schedule &amp; program
          </h2>
          {festival.canceled ? (
            <p className="mt-2 rounded-lg bg-red-50 p-4 text-sm font-medium text-red-900">Program and schedule actions are unavailable because this festival is canceled.</p>
          ) : festival.schedules.length ? (
            <div className="mt-4 space-y-3">
              {festival.schedules.map((event) => (
                <Card key={event.id} data-testid="program-item">
                  <CardContent className="flex flex-col gap-4 py-2 sm:flex-row sm:items-start">
                    <div className="min-w-36 shrink-0">
                      <p className="font-ui text-xs text-[#848484]">
                        {formatPhiladelphiaDate(event.start_time, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: undefined,
                        }) || "Date TBD"}
                      </p>
                      <p className="mt-1 flex items-center gap-1 font-ui text-sm font-medium">
                        <Clock className="size-4 text-[#848484]" />
                        {formatPhiladelphiaTime(event.start_time) || "Time TBD"}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-body text-lg font-semibold">{event.title}</h3>
                        {event.is_headliner && (
                          <Badge className="bg-brand-yellow text-brand-dark" variant="secondary">
                            Headliner
                          </Badge>
                        )}
                      </div>
                      {event.performer && <p className="text-sm text-[#45556C]">{event.performer}</p>}
                      {event.description && (
                        <p className="mt-2 text-sm leading-relaxed text-[#45556C]">{event.description}</p>
                      )}
                      <p className="mt-2 text-xs text-[#848484]">
                        {event.location || festival.locationLabel}
                        {event.genre ? ` · ${event.genre}` : ""}
                      </p>
                    </div>
                    <ScheduleSaveButton
                      type="event"
                      id={event.id}
                      name={event.title}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[#848484]">Program details are coming soon.</p>
          )}
        </section>
      </div>
    </main>
  );
}
