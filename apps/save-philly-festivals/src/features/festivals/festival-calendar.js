import ics from "ics";
import { prisma } from "@/lib/db";

function toIcsDate(date) {
  const d = new Date(date);
  return [
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
  ];
}

export async function generateThisMonthCalendar() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const festivals = await prisma.festival.findMany({
    where: {
      status: "approved",
      start_date: { gte: startOfMonth },
      end_date: { lte: endOfMonth },
    },
    include: {
      categories: { include: { category: true } },
    },
    orderBy: { start_date: "asc" },
  });

  if (festivals.length === 0) {
    console.log("No approved festivals this month.");
    return null;
  }

  console.log(`\nFestivals this month (${festivals.length}):`);
  for (const f of festivals) {
    console.log(`  - ${f.name} | ${f.start_date?.toLocaleDateString()} - ${f.end_date?.toLocaleDateString()} | ${f.location || f.city || "TBD"}`);
  }

  const events = festivals.map((f) => ({
    start: toIcsDate(f.start_date),
    end: toIcsDate(f.end_date),
    title: f.name,
    description: f.description || "",
    location: [f.location, f.city, f.state].filter(Boolean).join(", "),
    url: f.website_url || undefined,
    status: "CONFIRMED",
    organizer: f.contact_name ? { name: f.contact_name } : undefined,
  }));

  const { value, error } = ics.createEvents(events);

  if (error) {
    console.error("Failed to generate .ics:", error);
    return null;
  }

  return value;
}
