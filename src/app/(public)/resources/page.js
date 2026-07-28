import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ResourcesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="size-4" />
        Back to Home
      </Link>

      <h1 className="font-heading text-4xl font-bold mb-6">Resources</h1>

      <div className="space-y-8">
        <section>
          <h2 className="font-heading text-2xl font-semibold mb-3">
            Festival Producer Toolkit
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Everything you need to plan, promote, and execute a successful
            festival in Philadelphia. From permits to marketing, our toolkit
            covers the essentials.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-2xl font-semibold mb-3">
            Community Guidelines
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Our community guidelines help ensure every festival is safe,
            inclusive, and respectful. Learn about noise ordinances, vendor
            requirements, and accessibility standards.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-2xl font-semibold mb-3">
            Funding &amp; Sponsorship
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Explore funding opportunities from local foundations, city grants,
            and corporate sponsors who support Philadelphia&apos;s vibrant
            festival culture.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-2xl font-semibold mb-3">
            Volunteer Sign-Up
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Want to get involved? Volunteer at upcoming festivals and help make
            Philadelphia&apos;s community events unforgettable.
          </p>
        </section>
      </div>
    </div>
  );
}
