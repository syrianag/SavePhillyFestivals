import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/home/SectionHeading";
import { Reveal } from "@/components/home/Reveal";

export function CommunityStories({ articles }) {
  return (
    <section className="bg-muted py-16 md:py-24">
      <div className="mx-auto max-w-[1440px] px-4 md:px-[81px]">
        <Reveal>
          <SectionHeading
            eyebrow="Stories"
            title="Community stories"
            description="Why do people love these festivals? Hear from the organizers, vendors, and neighbors behind the magic."
          />
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-6 md:mt-14 md:grid-cols-3">
          {articles.map((article, i) => (
            <Reveal key={article.id} delay={i * 80}>
              <article
                className="flex h-full flex-col overflow-hidden rounded-2xl shadow-sm transition-shadow hover:shadow-lg"
                style={{ backgroundColor: article.bgColor }}
              >
                <div className="flex h-52 items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                  <span className="font-ui text-sm font-medium" style={{ color: article.textColor }}>
                    Add Photo
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3
                    className="font-heading text-xl font-bold leading-snug"
                    style={{ color: article.textColor }}
                  >
                    {article.title}
                  </h3>
                  <p
                    className="mt-2 font-body text-sm leading-relaxed"
                    style={{ color: article.textColor, opacity: 0.9 }}
                  >
                    {article.description}
                  </p>
                  <span
                    className="mt-4 inline-flex items-center gap-1.5 font-ui text-sm font-semibold"
                    style={{ color: article.textColor }}
                  >
                    Read the story <ArrowRight className="size-4" />
                  </span>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
