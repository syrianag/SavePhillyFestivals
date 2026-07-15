"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { festivals, nearbyVenues } from "@/lib/festivals";

const SOCIAL_ICONS = [
  { name: "Instagram", icon: "📸" },
  { name: "Facebook", icon: "👍" },
  { name: "LinkedIn", icon: "💼" },
  { name: "X", icon: "🐦" },
  { name: "TikTok", icon: "🎵" },
  { name: "Pinterest", icon: "📌" },
];

export default function FestivalDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const festival = festivals.find((f) => f.id === Number(id));

  if (!festival) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-20 text-center md:px-[81px]">
        <h1 className="font-heading text-2xl">Festival not found</h1>
        <Link href="/" className="mt-4 inline-block font-ui text-brand-orange underline">
          Go back home
        </Link>
      </div>
    );
  }

  const {
    title,
    date,
    location,
    category,
    badge,
    description,
    subtitle,
    about,
    images,
    bgColor,
    locationDetails,
    parking,
    transit,
    foodOptions,
    nearbyVenues: nearbyIds,
    socialLinks,
    accessibility,
    hashtags,
    instagramPosts,
    peopleCount,
  } = festival;

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-8 md:px-[81px] md:pb-24 md:pt-10">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 font-ui text-base font-semibold leading-[22px] text-black transition-opacity hover:opacity-70 md:mb-8 md:text-lg"
      >
        <ArrowLeft className="size-5" />
        Back
      </button>

      <div className="flex h-[200px] gap-2 overflow-hidden rounded-2xl md:h-[400px]">
        <div className="hidden w-[347px] shrink-0 items-center justify-center bg-[#F1EFEB] md:flex">
          <span className="font-ui text-sm text-[#848484]">Add Photo</span>
        </div>
        <div className="relative flex flex-1 items-center justify-center bg-[#E8E6E1]">
          <span className="font-ui text-sm text-[#848484]">Add Photo</span>
          <button className="absolute left-3 flex size-10 items-center justify-center rounded-full bg-white/80 text-black shadow-sm transition-colors hover:bg-white">
            <ChevronLeft className="size-5" />
          </button>
          <button className="absolute right-3 flex size-10 items-center justify-center rounded-full bg-white/80 text-black shadow-sm transition-colors hover:bg-white">
            <ChevronRight className="size-5" />
          </button>
        </div>
        <div className="hidden w-[347px] shrink-0 items-center justify-center bg-[#F1EFEB] md:flex">
          <span className="font-ui text-sm text-[#848484]">Add Photo</span>
        </div>
      </div>

      <div className="mt-6 md:mt-8">
        <div className="flex flex-wrap items-start gap-4">
          <h1 className="font-heading text-3xl font-bold leading-tight text-black md:text-[40px] md:leading-[47px]">
            {title}
          </h1>
          {badge && (
            <span className="mt-1.5 inline-flex items-center rounded-[4px] bg-brand-orange px-3 py-1 font-ui text-xs font-bold leading-[15px] text-white md:mt-2">
              {badge}
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-[16px] bg-brand-yellow px-4 py-1.5 font-body text-sm font-semibold leading-[17px] text-black">
            {category}
          </span>
          <span className="inline-flex items-center rounded-[16px] bg-brand-yellow px-4 py-1.5 font-body text-sm font-semibold leading-[17px] text-black">
            Food
          </span>
        </div>

        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
          <span className="flex items-center gap-2 font-ui text-base leading-[24px] text-black md:text-xl">
            <Calendar className="size-5 text-[#848484]" />
            {date}
          </span>
          <span className="flex items-center gap-2 font-ui text-base leading-[24px] text-black md:text-xl">
            <MapPin className="size-5 text-[#848484]" />
            {location}
          </span>
          {peopleCount && (
            <span className="flex items-center gap-2 font-ui text-base leading-[24px] text-black md:text-xl">
              <Users className="size-5 text-[#848484]" />
              {peopleCount}
            </span>
          )}
        </div>
      </div>

      {about && (
        <section className="mt-10 md:mt-14">
          <h2 className="font-serif text-2xl leading-snug text-black md:text-[28px] md:leading-[34px]">
            About this event
          </h2>
          {subtitle && (
            <p className="mt-2 font-heading text-base font-medium leading-snug text-black md:text-lg">
              {subtitle}
            </p>
          )}
          <p className="mt-4 max-w-[744px] font-body text-base leading-[24px] text-black md:text-lg md:leading-[27px]">
            {about}
          </p>
        </section>
      )}

      {locationDetails && (
        <section className="mt-10 md:mt-14">
          <h2 className="font-serif text-2xl leading-snug text-black md:text-[28px] md:leading-[34px]">
            Location
          </h2>
          <div className="mt-4 flex h-[200px] items-center justify-center rounded-[15px] bg-[#F1EFEB] md:h-[330px]">
            <span className="font-ui text-sm text-[#848484]">Add Photo</span>
          </div>
        </section>
      )}

      {parking && (
        <section className="mt-8 md:mt-10">
          <h3 className="font-ui text-xl font-medium leading-7 text-black md:text-[25px]">
            Parking
          </h3>
          <p className="mt-2 max-w-[744px] font-body text-base leading-[24px] text-[#424242] md:text-lg md:leading-[27px]">
            {parking}
          </p>
        </section>
      )}

      {transit && (
        <section className="mt-6 md:mt-8">
          <h3 className="font-ui text-xl font-medium leading-7 text-black md:text-[25px]">
            Public Transit
          </h3>
          <p className="mt-2 max-w-[744px] font-body text-base leading-[24px] text-[#424242] md:text-lg md:leading-[27px]">
            {transit}
          </p>
        </section>
      )}

      {foodOptions && (
        <section className="mt-8 md:mt-10">
          <h2 className="font-serif text-2xl leading-snug text-black md:text-[28px] md:leading-[34px]">
            Food Options
          </h2>
          <p className="mt-2 max-w-[744px] font-body text-base leading-[24px] text-[#424242] md:text-lg md:leading-[27px]">
            {foodOptions}
          </p>
        </section>
      )}

      {hashtags && hashtags.length > 0 && (
        <section className="mt-10 md:mt-14">
          <h2 className="font-serif text-2xl leading-snug text-black md:text-[28px] md:leading-[34px]">
            Follow the conversation
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {hashtags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-[4px] bg-brand-yellow px-3 py-1 font-ui text-sm font-medium leading-[17px] text-black"
              >
                #{tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {instagramPosts && instagramPosts.length > 0 && (
        <section className="mt-10 md:mt-14">
          <div className="flex gap-4 overflow-x-auto pb-4">
            {instagramPosts.map((post, i) => (
              <div
                key={i}
                className="flex w-[200px] shrink-0 flex-col overflow-hidden rounded-xl bg-white shadow-sm md:w-[243px]"
              >
                <div className="flex h-[280px] items-center justify-center bg-[#F1EFEB] md:h-[335px]">
                  <span className="font-ui text-sm text-[#848484]">Add Photo</span>
                </div>
                <div className="px-3 py-2.5">
                  <p className="font-footer text-sm font-medium leading-[18px] text-black">
                    {post}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {accessibility && accessibility.length > 0 && (
        <section className="mt-10 md:mt-14">
          <h2 className="font-serif text-2xl leading-snug text-black md:text-[28px] md:leading-[34px]">
            Accessibility
          </h2>
          <div className="mt-4 flex flex-wrap gap-4">
            {accessibility.includes("wheelchair") && (
              <div className="flex items-center gap-3 rounded-xl border border-[#848484] px-5 py-3">
                <span className="font-ui text-2xl">♿</span>
                <span className="font-ui text-sm font-medium leading-[17px] text-black">
                  Wheelchair Accessible
                </span>
              </div>
            )}
            {accessibility.includes("assistive-listening") && (
              <div className="flex items-center gap-3 rounded-xl border border-[#848484] px-5 py-3">
                <span className="font-ui text-2xl">🦻</span>
                <span className="font-ui text-sm font-medium leading-[17px] text-black">
                  Assistive Listening
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="mt-10 md:mt-14">
        <button
          className="inline-flex h-[52px] items-center justify-center rounded-[16px] bg-brand-coral px-10 font-body text-lg font-bold uppercase leading-[22px] text-white transition-opacity hover:opacity-90 md:h-[60px] md:text-2xl md:leading-[29px]"
          style={{ backgroundColor: "#FF8577" }}
        >
          Book Tickets
        </button>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <span className="font-ui text-sm font-medium leading-[17px] text-[#848484]">Share</span>
        <div className="flex items-center gap-3">
          {SOCIAL_ICONS.map((s) => (
            <a
              key={s.name}
              href="#"
              className="flex size-9 items-center justify-center rounded-full bg-[#F1EFEB] text-sm transition-colors hover:bg-gray-200"
              aria-label={s.name}
            >
              {s.icon}
            </a>
          ))}
        </div>
      </div>

      <div className="mt-10 h-px bg-[#848484] md:mt-14" />

      {nearbyIds && nearbyIds.length > 0 && (
        <section className="mt-10 md:mt-14">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl leading-snug text-black md:text-[28px] md:leading-[34px]">
              Local Guides
            </h2>
            <div className="flex gap-2">
              <button className="flex size-9 items-center justify-center rounded-full border border-[#848484] text-[#848484] transition-colors hover:bg-gray-100">
                <ChevronLeft className="size-5" />
              </button>
              <button className="flex size-9 items-center justify-center rounded-full border border-[#848484] text-[#848484] transition-colors hover:bg-gray-100">
                <ChevronRight className="size-5" />
              </button>
            </div>
          </div>
          <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
            {nearbyIds.map((venueId) => {
              const venue = nearbyVenues.find((v) => v.id === venueId);
              if (!venue) return null;
              return (
                <div
                  key={venue.id}
                  className="flex w-[200px] shrink-0 flex-col overflow-hidden rounded-xl bg-white shadow-sm md:w-[243px]"
                >
                  <div className="flex h-[200px] items-center justify-center bg-[#F1EFEB] md:h-[240px]">
                    <span className="font-ui text-sm text-[#848484]">Add Photo</span>
                  </div>
                  <div className="px-3 py-3">
                    <h4 className="font-ui text-sm font-bold leading-[17px] text-black">
                      {venue.name}
                    </h4>
                    <p className="mt-1 font-ui text-xs leading-[15px] text-[#848484]">
                      {venue.location}
                    </p>
                  </div>
                  <div className="border-t border-gray-100 px-3 py-2">
                    <p className="font-footer text-xs font-medium leading-[15px] text-[#848484]">
                      @{venue.name.toLowerCase().replace(/\s+/g, "")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
