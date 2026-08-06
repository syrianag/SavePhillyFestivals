import { requireProducer } from "@/lib/auth-helpers";
import { ProducerNav } from "@/components/producer/ProducerNav";

export default async function ProducerLayout({ children }) {
  await requireProducer();

  return (
    <div className="flex min-h-screen flex-col">
      <ProducerNav />
      <main className="flex-1 pb-16">
        <div className="mx-auto max-w-5xl px-4 py-8 md:px-[81px] md:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
