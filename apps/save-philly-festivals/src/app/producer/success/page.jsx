import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Submission Received - Save Philly Festivals",
  description: "Your festival submission has been received",
};

export default function SubmissionSuccessPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="text-6xl">🎉</div>
        <h1 className="text-3xl font-heading font-bold">
          Submission Received!
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Thank you for submitting your festival. Our team will review your
          submission and get back to you via email within 2-3 business days.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
          <Link href="/producer/submit">
            <Button>Submit Another Festival</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
