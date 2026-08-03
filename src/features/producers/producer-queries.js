import { prisma } from "@/lib/db";

export async function getProducersWithStats() {
  const producers = await prisma.user.findMany({
    where: { role: "producer" },
    select: {
      id: true,
      name: true,
      email: true,
      created_at: true,
    },
    orderBy: { created_at: "desc" },
  });

  const producerEmails = producers.map((p) => p.email);

  const festivals = await prisma.festival.findMany({
    where: { submitted_by: { in: producerEmails } },
    select: {
      id: true,
      name: true,
      status: true,
      created_at: true,
      submitted_by: true,
    },
    orderBy: { created_at: "desc" },
  });

  const festivalsBySubmitter = {};
  for (const f of festivals) {
    if (!festivalsBySubmitter[f.submitted_by]) {
      festivalsBySubmitter[f.submitted_by] = [];
    }
    festivalsBySubmitter[f.submitted_by].push(f);
  }

  return producers.map((producer) => {
    const producerFestivals = festivalsBySubmitter[producer.email] || [];
    const sorted = [...producerFestivals].sort(
      (a, b) => b.created_at - a.created_at
    );
    return {
      ...producer,
      festivalCount: producerFestivals.length,
      approvedCount: producerFestivals.filter(
        (f) => f.status === "approved"
      ).length,
      pendingCount: producerFestivals.filter(
        (f) => f.status === "pending"
      ).length,
      lastSubmission: sorted[0]?.created_at ?? null,
    };
  });
}

export async function getProducerStats() {
  const [producerCount, producers] = await Promise.all([
    prisma.user.count({ where: { role: "producer" } }),
    prisma.user.findMany({
      where: { role: "producer" },
      select: { email: true },
    }),
  ]);

  const producerEmails = producers.map((p) => p.email);

  const festivals = await prisma.festival.findMany({
    where: { submitted_by: { in: producerEmails } },
    select: { status: true },
  });

  return {
    total: producerCount,
    totalFestivals: festivals.length,
    approvedCount: festivals.filter((f) => f.status === "approved").length,
    pendingCount: festivals.filter((f) => f.status === "pending").length,
    draftCount: festivals.filter((f) => f.status === "draft").length,
  };
}

export async function getRecentActivity(limit = 10) {
  const [recentFestivals, recentUsers] = await Promise.all([
    prisma.festival.findMany({
      orderBy: { updated_at: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        status: true,
        submitted_by: true,
        created_at: true,
        updated_at: true,
      },
    }),
    prisma.user.findMany({
      orderBy: { created_at: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
      },
    }),
  ]);

  const activities = [];

  for (const f of recentFestivals) {
    let type = "updated";
    if (f.status === "pending") type = "submitted";
    else if (f.status === "approved") type = "approved";
    else if (f.status === "rejected") type = "rejected";

    activities.push({
      type,
      label: f.name,
      user: f.submitted_by,
      timestamp: f.updated_at,
      festivalId: f.id,
    });
  }

  for (const u of recentUsers) {
    activities.push({
      type: "user_created",
      label: u.name || u.email,
      user: u.email,
      role: u.role,
      timestamp: u.created_at,
    });
  }

  activities.sort((a, b) => b.timestamp - a.timestamp);
  return activities.slice(0, limit);
}
