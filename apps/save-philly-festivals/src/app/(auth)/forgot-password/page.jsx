import Link from "next/link";

import ForgotPasswordForm from "@/features/password-reset/ForgotPasswordForm";

export const metadata = {
  title: "Reset your password - Save Philly Festivals",
  description: "Request a link to reset your Save Philly Festivals password.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <h1 className="font-heading text-3xl font-bold text-slate-900">Reset your password</h1>
      <p className="mt-2 text-slate-600">
        Enter the email address on your account and we&apos;ll send you a link to choose a new
        password.
      </p>
      <ForgotPasswordForm />
      <p className="mt-6 text-sm text-slate-500">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-slate-800 underline underline-offset-2">Sign in</Link>
      </p>
    </div>
  );
}
