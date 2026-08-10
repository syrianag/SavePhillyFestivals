import Link from "next/link";

import SignupForm from "@/features/producer-access/SignupForm";

export const metadata = {
  title: "Create an account - Save Philly Festivals",
  description: "Create an account to submit a festival to Save Philly Festivals.",
};

export default function SignupPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <h1 className="font-heading text-3xl font-bold text-slate-900">Create your account</h1>
      {/* Set the expectation up front: signing up does not by itself grant the ability to
        * submit a festival. Producer access is reviewed separately. */}
      <p className="mt-2 text-slate-600">
        Signing up lets you request producer access. Our team reviews each request before you can
        submit a festival.
      </p>
      <SignupForm />
      <p className="mt-6 text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-slate-800 underline underline-offset-2">Sign in</Link>
      </p>
    </div>
  );
}
