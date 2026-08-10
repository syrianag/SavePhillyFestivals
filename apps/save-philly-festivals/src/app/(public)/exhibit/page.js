import Link from "next/link";
import Image from "next/image";
import { Camera, UserRoundPlus, Send, Search } from "lucide-react";
import { getPublicFestivalGallery } from "@/features/festivals/festival-queries";
import { CrossBlock, QuadrantBlock } from "@/components/shared/DecorativeBlocks";

export const metadata = {
  title: "Digital Exhibit - Save Philly Festivals",
  description: "A living photo exhibit of Philadelphia's festivals — and how to add your festival's photos.",
};

const UPLOAD_STEPS = [
  {
    icon: UserRoundPlus,
    title: "Create a free producer account",
    body: "Sign up in under a minute — there's no cost to submit or list your festival.",
    href: "/register?callbackUrl=%2Fproducer%2Fsubmit",
    action: "Sign up free",
  },
  {
    icon: Camera,
    title: "Add your photos to the submission",
    body: "Open your festival draft and attach images (JPEG, PNG, or WebP, up to 10 MB) using the private asset uploader, or paste a public image URL into the 'Public image URL' field.",
    href: "/producer/submit",
    action: "Start your submission",
  },
  {
    icon: Send,
    title: "Submit for review",
    body: "Send your submission to the team. Once a photo is approved and your festival is published, it appears in the exhibit automatically.",
    href: "/producer/dashboard",
    action: "Track your submission",
  },
];

export default async function DigitalExhibitPage() {
  let pieces = [];
  try {
    pieces = await getPublicFestivalGallery();
  } catch (error) {
    console.error("Digital exhibit gallery failed", error);
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 md:px-[81px] py-6 md:py-10">
      {/* Hero */}
      <section className="flex flex-col md:flex-row overflow-hidden rounded-3xl border border-slate-200 shadow-lg min-h-[400px] bg-slate-900 text-white mb-10">
        <div className="relative flex-1 p-8 sm:p-12 flex flex-col justify-between bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
            <CrossBlock bgColor="#FF6602" patternColor="#F6C847" />
          </div>
          <div className="relative z-10 space-y-4 max-w-xl my-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3.5 py-1 text-xs font-bold text-amber-300 border border-amber-400/20 shadow-3xs">
              <Camera className="size-3.5" />
              A LIVING GALLERY OF PHILLY FESTIVALS
            </span>
            <h1 className="font-heading text-4xl sm:text-5xl font-extrabold tracking-tight leading-none text-amber-300">
              The Digital Exhibit
            </h1>
            <p className="text-base sm:text-lg text-slate-350 leading-relaxed font-sans">
              Philadelphia&apos;s festival spirit — the block parties, cultural celebrations, and
              community gatherings — captured in photos from the people who live them. This gallery
              grows with every festival that shares its story.
            </p>
          </div>
        </div>
        <div
          className="relative h-[240px] md:h-auto md:w-[600px] shrink-0 bg-cover bg-center"
          style={{
            backgroundImage: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.1), rgba(15, 23, 42, 0.6)), url("https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=800")'
          }}
        >
          <div className="absolute inset-0 bg-indigo-900/10 mix-blend-overlay" />
        </div>
      </section>

      {/* Gallery */}
      <section aria-labelledby="exhibit-gallery-heading" className="pb-14">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-4">
          <h2 id="exhibit-gallery-heading" className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Featured photos
          </h2>
          <span className="font-ui text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {pieces.length} {pieces.length === 1 ? "photo" : "photos"}
          </span>
        </div>

        {pieces.length === 0 ? (
          <div className="mt-10 flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-16 text-center">
            <div className="flex items-center gap-3">
              <CrossBlock bgColor="#FF6602" patternColor="#F6C847" size={56} />
              <QuadrantBlock bgColor="#1E7BF6" patternColor="#50DEF1" size={56} />
            </div>
            <h3 className="mt-6 font-heading text-2xl font-bold text-slate-800">
              The exhibit is waiting for its first photo
            </h3>
            <p className="mx-auto mt-2 max-w-xl font-body text-slate-500">
              As festival organizers add photos to their submissions and they&apos;re approved, they&apos;ll
              appear here. If you organize a festival, your photos could be the first to hang on the wall.
            </p>
            <Link
              href="/producer"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-indigo-600 px-6 font-ui text-sm font-bold text-white shadow-2xs hover:bg-indigo-500 transition-colors"
            >
              Add your festival&apos;s photos
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pieces.map((festival) => (
              <Link
                key={festival.id}
                href={`/festivals/${festival.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                <div className="relative h-52 w-full overflow-hidden bg-slate-100">
                  {festival.image_url ? (
                    <Image
                      src={festival.image_url}
                      alt={festival.name}
                      fill
                      unoptimized
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-600 to-slate-900" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-5">
                  <h3 className="font-heading text-lg font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                    {festival.name}
                  </h3>
                  <p className="font-body text-sm text-slate-500">{festival.locationLabel}</p>
                  <p className="font-ui text-xs font-semibold text-slate-400">{festival.dateLabel}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Upload instructions */}
      <section aria-labelledby="exhibit-upload-heading" className="rounded-3xl border border-slate-200 bg-slate-50/60 px-6 py-12 sm:px-10">
        <div className="text-center">
          <p className="font-ui text-sm font-bold uppercase tracking-widest text-indigo-600">For festival organizers</p>
          <h2 id="exhibit-upload-heading" className="mt-3 font-heading text-3xl font-extrabold text-slate-900 sm:text-[34px]">
            Add your photos to the exhibit
          </h2>
          <p className="mx-auto mt-3 max-w-2xl font-body text-slate-600">
            Any Philadelphia festival organizer can have their photos featured here. It&apos;s free, takes a
            few minutes, and every submission is reviewed by the team before anything goes public.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {UPLOAD_STEPS.map((step, index) => (
            <div key={step.title} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-indigo-600 text-white">
                  <step.icon className="size-5" />
                </span>
                <span className="font-ui text-sm font-bold text-slate-400">Step {index + 1}</span>
              </div>
              <h3 className="mt-4 font-heading text-lg font-bold text-slate-900">{step.title}</h3>
              <p className="mt-2 flex-1 font-body text-sm leading-relaxed text-slate-600">{step.body}</p>
              <Link href={step.href} className="mt-5 inline-flex items-center gap-1.5 font-ui text-sm font-bold text-indigo-600 hover:text-indigo-500">
                {step.action} <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/producer"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-indigo-600 px-6 py-2.5 font-ui text-sm font-bold text-white shadow-2xs hover:bg-indigo-500 transition-colors"
          >
            Learn how submissions work
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-2.5 font-ui text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Search className="size-4" />
            Discover all festivals
          </Link>
        </div>
      </section>
    </div>
  );
}
