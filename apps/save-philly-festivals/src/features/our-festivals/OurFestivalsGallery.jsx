"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export default function OurFestivalsGallery({ items }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const closeRef = useRef(null);
  const openerRef = useRef(null);
  const isOpen = activeIndex !== null;
  const active = isOpen ? items[activeIndex] : null;

  const close = useCallback(() => {
    setActiveIndex(null);
    /* Focus goes back to the thumbnail that opened the lightbox. Without this it falls to
     * document body and a keyboard user restarts from the top of the page. */
    openerRef.current?.focus();
  }, []);

  const step = useCallback((delta) => {
    setActiveIndex((current) => {
      if (current === null) return current;
      return (current + delta + items.length) % items.length;
    });
  }, [items.length]);

  useEffect(() => {
    if (!isOpen) return undefined;
    function onKeyDown(event) {
      if (event.key === "Escape") close();
      else if (event.key === "ArrowRight") step(1);
      else if (event.key === "ArrowLeft") step(-1);
    }
    document.addEventListener("keydown", onKeyDown);
    /* The page behind a modal must not scroll; restored on close so navigating away from an
     * open lightbox cannot leave the body permanently locked. */
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [isOpen, close, step]);

  if (!items.length) {
    return (
      <p className="py-16 text-center text-slate-500">
        Our Festivals gallery is being curated. Check back soon.
      </p>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={(event) => { openerRef.current = event.currentTarget; setActiveIndex(index); }}
              className="group block w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-2xs transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label={`View ${item.title} larger`}
            >
              {/* Fixed 3:2 frame so mixed source ratios still tile evenly. */}
              <div className="aspect-3/2 w-full overflow-hidden bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image_url}
                  alt={item.alt_text}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <h2 className="font-heading text-base font-bold text-slate-900">{item.title}</h2>
                {item.caption && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{item.caption}</p>}
              </div>
            </button>
          </li>
        ))}
      </ul>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4"
          onClick={(event) => { if (event.target === event.currentTarget) close(); }}
        >
          <div className="relative max-h-full w-full max-w-4xl overflow-y-auto rounded-2xl bg-white">
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 text-slate-700 shadow-xs hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <X className="size-5" aria-hidden="true" />
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={active.image_url} alt={active.alt_text} className="max-h-[70vh] w-full bg-slate-100 object-contain" />

            <div className="p-6">
              <h2 className="font-heading text-2xl font-bold text-slate-900">{active.title}</h2>
              {active.caption && <p className="mt-2 text-slate-600">{active.caption}</p>}
              {active.festival && (
                <Link href={`/festivals/${active.festival.slug}`} className="mt-4 inline-block font-ui text-sm font-bold text-indigo-700 hover:underline">
                  View {active.festival.name} →
                </Link>
              )}
            </div>

            {items.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Previous item"
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-700 shadow-xs hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <ChevronLeft className="size-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Next item"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-700 shadow-xs hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <ChevronRight className="size-5" aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
