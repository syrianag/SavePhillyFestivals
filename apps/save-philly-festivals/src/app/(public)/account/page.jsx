import { redirect } from "next/navigation";

import ProducerAccessPanel from "@/features/producer-access/ProducerAccessPanel";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your account - Save Philly Festivals" };

/* Lives outside /producer on purpose: that route group denies anyone without the producer role,
 * which is exactly the person who needs this page. */
export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Faccount");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-heading text-3xl font-bold text-slate-900">Your account</h1>
      <p className="mt-2 text-slate-600">Signed in as {session.user.email}</p>
      <div className="mt-8">
        <ProducerAccessPanel />
      </div>
    </div>
  );
}
