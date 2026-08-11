import Link from "next/link";

import ResetPasswordForm from "@/features/password-reset/ResetPasswordForm";

export const metadata = {
  title: "Choose a new password - Save Philly Festivals",
  description: "Set a new password for your Save Philly Festivals account.",
  robots: { index: false, follow: false },
};

/* Rendered per request: the page is keyed entirely off a one-time token in the query string, so
 * there is nothing here worth prerendering or caching. */
export const dynamic = "force-dynamic";

/**
 * The token is read server-side and handed to the client form as a prop rather than pulled from
 * `useSearchParams`, which keeps the form free of a client-side search-param dependency and its
 * Suspense requirement.
 */
export default async function ResetPasswordPage({ searchParams }) {
  const token = (await searchParams)?.token;

  if (typeof token !== "string" || !token) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
        <h1 className="font-heading text-3xl font-bold text-slate-900">This link isn&apos;t valid</h1>
        <p className="mt-2 text-slate-600">
          The reset link is missing its token. It may have been broken across two lines by your email
          client — try copying the whole address, or request a new link.
        </p>
        <p className="mt-6 text-sm text-slate-500">
          <Link href="/forgot-password" className="font-semibold text-slate-800 underline underline-offset-2">
            Request a new reset link
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <h1 className="font-heading text-3xl font-bold text-slate-900">Choose a new password</h1>
      <p className="mt-2 text-slate-600">
        This link works once. After you save, you&apos;ll sign in with the new password.
      </p>
      <ResetPasswordForm token={token} />
      <p className="mt-6 text-sm text-slate-500">
        Link expired?{" "}
        <Link href="/forgot-password" className="font-semibold text-slate-800 underline underline-offset-2">
          Request a new one
        </Link>
      </p>
    </div>
  );
}
