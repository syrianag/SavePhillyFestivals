import Link from "next/link";
import { tours } from "@/lib/festivals";
import { CrossBlock, QuadrantBlock } from "@/components/shared/DecorativeBlocks";
import { Calendar, Compass, MapPin, Ticket } from "lucide-react";

export default function ToursPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 md:px-[81px] py-6 md:py-10">
      {/* Premium Hero Banner */}
      <section className="flex flex-col md:flex-row overflow-hidden rounded-3xl border border-slate-200 shadow-lg min-h-[464px] bg-slate-900 text-white mb-8">
        {/* Cover image area */}
        <div 
          className="relative h-[240px] md:h-auto md:w-[600px] shrink-0 bg-cover bg-center"
          style={{ 
            backgroundImage: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.1), rgba(15, 23, 42, 0.6)), url("https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800")'
          }}
        >
          <div className="absolute inset-0 bg-indigo-900/10 mix-blend-overlay" />
        </div>
        
        {/* Colorful geometric accent layout */}
        <div className="relative flex-1 p-8 sm:p-12 flex flex-col justify-between bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950">
          {/* Decorative geometric patterns */}
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
            <QuadrantBlock bgColor="#FF6602" patternColor="#F6C847" />
          </div>
          
          <div className="relative z-10 space-y-4 max-w-xl my-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3.5 py-1 text-xs font-bold text-amber-300 border border-amber-400/20 shadow-3xs">
              <Compass className="size-3.5" />
              GUIDED EXPERIENCES
            </span>
            <h1 className="font-heading text-4xl sm:text-5xl font-extrabold tracking-tight leading-none text-amber-300">
              City of Festivals Tours
            </h1>
            <p className="text-base sm:text-lg text-slate-350 leading-relaxed font-sans">
              Ride the streets of the City of Festivals to witness a memory lane of good times at the Philly Festivals Tour.
            </p>
          </div>
        </div>
      </section>

      {/* Decorative slider dots replacement */}
      <div className="flex items-center justify-center gap-2 py-4 mb-6">
        <span className="size-[8px] rounded-full bg-slate-800" />
        <span className="size-[8px] rounded-full bg-slate-200" />
        <span className="size-[8px] rounded-full bg-slate-200" />
        <span className="size-[8px] rounded-full bg-slate-200" />
        <span className="size-[8px] rounded-full bg-slate-200" />
      </div>

      {/* Intro section */}
      <section className="flex flex-col gap-8 pb-10 md:flex-row md:items-center">
        <div className="flex-1">
          <p className="max-w-[888px] font-serif text-xl sm:text-2xl leading-relaxed text-slate-800">
            See a diverse display of vibes, cuisine, music, dance, photos, videos, and stories from the neighbors and neighborhoods that host these special gatherings.
          </p>
        </div>
        <div 
          className="relative h-[260px] w-full shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-cover bg-center md:w-[380px] shadow-xs"
          style={{ 
            backgroundImage: 'url("https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=600")'
          }}
        />
      </section>

      {/* Main description paragraph */}
      <section className="pb-10 border-b border-slate-100 mb-10">
        <p className="max-w-4xl font-body text-base sm:text-lg leading-relaxed text-slate-650">
          Philadelphia&apos;s festival culture lives in its neighborhoods—each one with its own flavors, sounds, and stories. Our guided tours take you through the communities that make these celebrations happen, connecting you to the people and places behind the music, food, and traditions that define our city. Whether you hop on a bus, lace up your sneakers, or explore at your own pace, you&apos;ll experience the block parties, cultural celebrations, and community gatherings that make Philly the City of Brotherly Love and Sisterly Affection.
        </p>
      </section>

      {/* Tours Grid Title */}
      <section className="pb-6">
        <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Ticket className="size-6 text-indigo-600" />
          Tour Options
        </h2>
      </section>

      {/* Tours Cards Grid */}
      <section className="grid grid-cols-1 gap-6 pb-16 md:grid-cols-3 md:gap-8 md:pb-24">
        {tours.map((tour) => (
          <div
            key={tour.id}
            className="group flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all duration-300 bg-white"
          >
            {/* Card image/gradient */}
            <div 
              className="relative h-[180px] bg-cover bg-center transition-transform duration-500 group-hover:scale-102"
              style={{ 
                backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.4)), url(${
                  tour.type === "History" 
                    ? "https://images.unsplash.com/photo-1571401888741-ac437b985c5d?auto=format&fit=crop&q=80&w=400"
                    : tour.type === "Food & Drink" 
                    ? "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=400"
                    : "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&q=80&w=400"
                })`
              }}
            />
            
            {/* Card content */}
            <div className="flex flex-1 flex-col gap-6 p-6 bg-white transition-colors">
              <div className="flex flex-col gap-4">
                <div
                  className="inline-flex w-fit items-center justify-center px-5 rounded-full"
                  style={{
                    backgroundColor: tour.pillColor,
                    height: "36px",
                  }}
                >
                  <span className="font-heading text-sm font-bold text-slate-950">
                    {tour.type}
                  </span>
                </div>
                
                <p className="font-body text-sm leading-relaxed text-slate-500">
                  {tour.description}
                </p>
              </div>
              
              <button
                type="button"
                className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-900 hover:bg-slate-900 hover:text-white py-2.5 font-ui text-sm font-bold text-slate-900 transition-all cursor-pointer shadow-3xs"
              >
                Book now ({tour.price})
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
