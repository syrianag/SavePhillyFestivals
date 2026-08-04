import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import ProducerShell from "@/features/producer-submission/ProducerShell";
import { authorizeProducerPage } from "@/features/producer-submission/producer-page-authorization";

export default async function ProducerLayout({ children }) {
  const authorization = await authorizeProducerPage();
  if (authorization.status === "unauthenticated") {
    const requestedPath = (await headers()).get("x-producer-path") || "/producer/dashboard";
    const callbackUrl = requestedPath.startsWith("/producer/") ? requestedPath : "/producer/dashboard";
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (authorization.status === "denied") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm" role="alert" aria-labelledby="producer-access-title">
          <h1 id="producer-access-title" className="font-heading text-3xl font-bold">Producer access unavailable</h1>
          <p className="mt-3 text-slate-600">A verified producer account is required to manage festival submissions.</p>
          <Link href="/producer" className="mt-6 inline-flex rounded-md bg-black px-5 py-3 font-semibold text-white">Return to producer information</Link>
        </section>
      </main>
    );
  }

  return <ProducerShell user={authorization.user}>{children}</ProducerShell>;
}
