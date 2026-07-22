import Link from "next/link";
import { tours } from "@/lib/festivals";
import { CrossBlock, QuadrantBlock } from "@/components/shared/DecorativeBlocks";

export default function ToursPage() {
  return (
    <div className="mx-auto max-w-[1440px]">
      <section className="flex h-[464px] flex-col md:flex-row">
        <div className="flex h-[232px] w-full items-center justify-center bg-[#D9D9D9] md:h-full md:w-[700px]">
          <span className="font-ui text-sm text-[#848484]">Add Photo</span>
        </div>
        <div className="relative flex h-[232px] flex-1 md:h-full" style={{ backgroundColor: "#206C4E" }}>
          <div className="absolute left-0 top-0 h-[232px] w-[232px]" style={{ backgroundColor: "#E7E700" }} />
          <div className="absolute" style={{ left: "233px", top: "0px" }}>
            <CrossBlock bgColor="#FF93F0" patternColor="#FB439B" />
          </div>
          <div className="absolute" style={{ left: "465px", top: "0px" }}>
            <QuadrantBlock bgColor="#FF6602" patternColor="#F6C847" />
          </div>
          <div
            className="absolute flex flex-col gap-3 px-4 md:px-0"
            style={{ left: "40px", top: "285px" }}
          >
            <h1
              className="font-heading text-[28px] font-bold leading-tight md:text-[40px] md:leading-[47px]"
              style={{ color: "#F6C847" }}
            >
              City of Festivals Tours
            </h1>
            <p className="max-w-[552px] font-body text-base leading-[19px] text-white md:text-base">
              Ride the streets of the City of Festivals to witness a memory lane of good times at the
              Philly Festivals&nbsp;Tour.
            </p>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end gap-[6px] px-4 py-4 md:px-[81px] md:py-6">
        <span className="size-[9px] rounded-full bg-[#3D3D3D]" />
        <span className="size-[9px] rounded-full bg-[#D9D9D9]" />
        <span className="size-[9px] rounded-full bg-[#D9D9D9]" />
        <span className="size-[9px] rounded-full bg-[#D9D9D9]" />
        <span className="size-[9px] rounded-full bg-[#D9D9D9]" />
      </div>

      <section className="flex flex-col gap-8 px-4 pb-8 md:flex-row md:px-10 md:pb-12">
        <div className="flex-1">
          <p
            className="max-w-[888px] font-serif text-xl leading-snug md:text-[28px] md:leading-[34px]"
            style={{ color: "#050505" }}
          >
            See a diverse display of vibes, cuisine, music, dance, photos, videos, and stories from
            the neighbors and neighborhoods that host these special gatherings.
          </p>
        </div>
        <div className="flex h-[380px] w-full shrink-0 items-center justify-center rounded-[16px] bg-[#D9D9D9] md:w-[428px]">
          <span className="font-ui text-sm text-[#848484]">Add Photo</span>
        </div>
      </section>

      <section className="px-4 pb-6 md:px-10 md:pb-8">
        <p
          className="max-w-[888px] font-body text-base leading-[19px]"
          style={{ color: "#050505" }}
        >
          Philadelphia&apos;s festival culture lives in its neighborhoods—each one with its own
          flavors, sounds, and stories. Our guided tours take you through the communities that make
          these celebrations happen, connecting you to the people and places behind the music, food,
          and traditions that define our city. Whether you hop on a bus, lace up your sneakers, or
          explore at your own pace, you&apos;ll experience the block parties, cultural celebrations,
          and community gatherings that make Philly the City of Brotherly Love and Sisterly Affection.
        </p>
      </section>

      <section className="px-4 pb-6 md:px-10 md:pb-8">
        <h2
          className="font-ui text-2xl font-bold leading-[26px] md:text-[36px]"
          style={{ letterSpacing: "-0.198857px", color: "#000000" }}
        >
          Tour Options
        </h2>
      </section>

      <section className="grid grid-cols-1 gap-6 px-4 pb-16 md:grid-cols-3 md:gap-6 md:px-10 md:pb-24">
        {tours.map((tour) => (
          <div
            key={tour.id}
            className="flex w-full flex-col overflow-hidden rounded-xl"
          >
            <div className="flex h-[209px] items-center justify-center bg-[#D9D9D9]">
              <span className="font-ui text-sm text-[#848484]">Add Photo</span>
            </div>
            <div className="flex min-h-[219px] flex-col gap-[53px] px-[9px] pb-6 pt-5" style={{ backgroundColor: "#EBEBEB" }}>
              <div className="flex flex-col gap-[22px]">
                <div
                  className="inline-flex w-fit items-center justify-center px-7 py-[9px]"
                  style={{
                    backgroundColor: tour.pillColor,
                    borderRadius: "23px",
                    height: "46px",
                  }}
                >
                  <span className="font-heading text-[22px] font-medium leading-[26px] text-black">
                    {tour.type}
                  </span>
                </div>
                <p
                  className="max-w-[394px] font-body text-base leading-[19px]"
                  style={{ color: "#666566" }}
                >
                  {tour.description}
                </p>
              </div>
              <div
                className="inline-flex w-fit items-center justify-center gap-2.5 border border-black px-0"
                style={{ borderRadius: "12px", height: "32px", width: "159px" }}
              >
                <span className="font-body text-base font-bold leading-[19px] text-center text-black">
                  Book now ({tour.price})
                </span>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
