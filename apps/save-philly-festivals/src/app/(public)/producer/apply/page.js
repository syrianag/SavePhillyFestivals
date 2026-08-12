import ProducerApplicationForm from "@/features/producer-access/ProducerApplicationForm";

export const metadata = {
  title: "Become a Producer | Philly Festivals",
  description: "Apply to list your festival on Philly Festivals — create your account and submit your event in one step.",
};

export default function ProducerApplyPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
          Become a producer &amp; submit your event
        </h1>
        <p className="mt-3 text-slate-600">
          One form creates your account and sends your festival to our team for review. We&apos;ll
          email you once it has been reviewed.
        </p>
      </header>

      <ProducerApplicationForm />
    </section>
  );
}
