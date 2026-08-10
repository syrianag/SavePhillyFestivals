import AdminProducerRequests from "@/features/producer-access/AdminProducerRequests";
import { accountEmailsEnabled } from "@/features/producer-access/producer-access-notifications";
import { producerAccessRepository } from "@/features/producer-access/producer-access-repository";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
export const metadata = { title: "Producer access requests - Save Philly Festivals" };

export default async function AdminProducerRequestsPage() {
  await requireAdmin();
  const requests = await producerAccessRepository.listRequests();
  return <AdminProducerRequests initialRequests={requests} emailsEnabled={accountEmailsEnabled()} />;
}
