import { requireAdmin } from "@/lib/auth-helpers";
import FestivalSubmissionForm from "@/features/festivals/FestivalSubmissionForm";

export const metadata = {
  title: "Submit Festival - Save Philly Festivals",
  description: "Submit a new festival for review",
};

export default async function AdminSubmitPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold">Submit Festival</h1>
        <p className="text-muted-foreground">
          Submit a new festival for public listing
        </p>
      </div>

      <FestivalSubmissionForm />
    </div>
  );
}
