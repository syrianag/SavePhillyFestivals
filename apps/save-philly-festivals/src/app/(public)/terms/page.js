export const metadata = {
  title: "Terms - Save Philly Festivals",
  description: "Draft terms of use for Save Philly Festivals.",
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
      <p className="inline-flex rounded-full bg-amber-100 px-3 py-1 font-ui text-sm font-bold text-amber-950">
        Draft policy — pending legal approval
      </p>
      <h1 className="mt-5 font-heading text-4xl font-bold text-slate-950">Terms of use</h1>
      <p className="mt-4 text-lg leading-8 text-slate-700">
        These preliminary terms are provided for transparency and are not the final legally approved terms. They will be replaced after legal review.
      </p>
      <div className="mt-10 space-y-8 text-slate-700">
        <section aria-labelledby="terms-use"><h2 id="terms-use" className="text-2xl font-bold text-slate-950">Responsible use</h2><p className="mt-2 leading-7">Use the site lawfully, do not interfere with its operation, and provide accurate information when submitting festival or account details.</p></section>
        <section aria-labelledby="terms-listings"><h2 id="terms-listings" className="text-2xl font-bold text-slate-950">Festival information</h2><p className="mt-2 leading-7">Festival dates, locations, schedules, and availability can change. Confirm important details with the festival organizer before making plans.</p></section>
        <section aria-labelledby="terms-status"><h2 id="terms-status" className="text-2xl font-bold text-slate-950">Policy status</h2><p className="mt-2 leading-7">Final provisions covering warranties, liability, intellectual property, disputes, governing law, and formal contact information remain pending legal approval.</p></section>
      </div>
    </article>
  );
}
