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
        <p className="text-sm text-muted-foreground">Content</p>
        <p className="text-3xl font-heading font-bold">Submit Festival</p>
        <p className="text-muted-foreground">
          Submit a new festival for public listing
        </p>
      </div>

      <FestivalSubmissionForm />
    </div>
  );
}
