import { getPublicFestivalCatalog } from "@/features/festivals/festival-queries";
import { CalendarClient } from "@/features/schedule/CalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const festivals = await getPublicFestivalCatalog();
  return <CalendarClient festivals={festivals} />;
}
