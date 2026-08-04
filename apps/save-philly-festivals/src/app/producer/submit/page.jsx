import ProducerSubmissionEditor from "@/features/producer-submission/ProducerSubmissionEditor";

export const metadata = {
  title: "Festival submission - Save Philly Festivals",
  description: "Create or resume a private producer festival submission.",
};

export default async function SubmitFestivalPage({ searchParams }) {
  const id = (await searchParams)?.id;
  return <ProducerSubmissionEditor festivalId={typeof id === "string" ? id : null} />;
}
