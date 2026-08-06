export const metadata = {
  title: "Privacy - Save Philly Festivals",
  description: "Draft privacy notice for Save Philly Festivals.",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
      <p className="inline-flex rounded-full bg-amber-100 px-3 py-1 font-ui text-sm font-bold text-amber-950">
        Draft policy — pending legal approval
      </p>
      <h1 className="mt-5 font-heading text-4xl font-bold text-slate-950">Privacy notice</h1>
      <p className="mt-4 text-lg leading-8 text-slate-700">
        This page is a preliminary summary and is not the final approved privacy policy. It will be updated after legal review.
      </p>
      <div className="mt-10 space-y-8 text-slate-700">
        <section aria-labelledby="privacy-data"><h2 id="privacy-data" className="text-2xl font-bold text-slate-950">Information we handle</h2><p className="mt-2 leading-7">We may process information people submit through festival, account, schedule, or contact workflows, together with basic technical information needed to operate and secure the site.</p></section>
        <section aria-labelledby="privacy-use"><h2 id="privacy-use" className="text-2xl font-bold text-slate-950">How information is used</h2><p className="mt-2 leading-7">Information may be used to provide site features, review festival submissions, communicate about requested services, and maintain reliability and security.</p></section>
        <section aria-labelledby="privacy-status"><h2 id="privacy-status" className="text-2xl font-bold text-slate-950">Policy status</h2><p className="mt-2 leading-7">Retention periods, service-provider disclosures, privacy request procedures, and a formal contact channel remain pending legal and operational approval.</p></section>
      </div>
    </article>
  );
}
