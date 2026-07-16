import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const producerEmail = session.user.email;

  const festivals = await prisma.festival.findMany({
    where: { submitted_by: producerEmail },
    include: {
      schedules: {
        include: {
          saved_schedules: true,
        },
      },
      categories: { include: { category: true } },
    },
    orderBy: { created_at: "desc" },
  });

  const totalFestivals = festivals.length;
  const approvedFestivals = festivals.filter(f => f.status === "approved").length;
  const pendingFestivals = festivals.filter(f => f.status === "pending").length;
  const draftFestivals = festivals.filter(f => f.status === "draft").length;

  const totalInterested = festivals.reduce((sum, f) => {
    return sum + f.schedules.reduce((s, sched) => s + sched.saved_schedules.length, 0);
  }, 0);

  const now = new Date();
  const upcomingFestivals = festivals.filter(f => f.start_date && new Date(f.start_date) > now);

  return NextResponse.json({
    stats: {
      totalFestivals,
      approvedFestivals,
      pendingFestivals,
      draftFestivals,
      totalInterested,
      upcomingCount: upcomingFestivals.length,
    },
    festivals: festivals.map(f => ({
      id: f.id,
      name: f.name,
      slug: f.slug,
      status: f.status,
      location: f.location,
      city: f.city,
      state: f.state,
      start_date: f.start_date,
      end_date: f.end_date,
      image_url: f.image_url,
      description: f.description,
      contact_name: f.contact_name,
      contact_email: f.contact_email,
      host_name: f.host_name,
      host_title: f.host_title,
      host_about: f.host_about,
      interested: f.schedules.reduce((s, sched) => s + sched.saved_schedules.length, 0),
      scheduleCount: f.schedules.length,
      categories: f.categories.map(c => c.category?.name).filter(Boolean),
      schedules: f.schedules.map(s => ({
        id: s.id,
        title: s.title,
        description: s.description,
        location: s.location,
        start_time: s.start_time,
        end_time: s.end_time,
        performer: s.performer,
        genre: s.genre,
        is_headliner: s.is_headliner,
        interested: s.saved_schedules.length,
      })),
    })),
  });
}
