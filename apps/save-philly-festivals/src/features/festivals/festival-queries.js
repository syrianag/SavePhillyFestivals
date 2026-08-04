import { prisma } from "@/lib/db";
import { FESTIVAL_STATUS } from "@/lib/constants";
import { ConflictError } from "@/lib/errors";
import {
  getDiscoveryE2eFestival,
  getDiscoveryE2eFestivalCatalog,
} from "@/features/festivals/discovery-e2e-fixture";
import {
  mapPublicFestival,
  PUBLIC_FESTIVAL_SELECT,
} from "@/features/festivals/public-festival";

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function getFestivals({
  status,
  page = 1,
  limit = 20,
  search,
} = {}) {
  const where = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * limit;

  const [festivals, total] = await Promise.all([
    prisma.festival.findMany({
      where,
      include: {
        schedules: true,
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    prisma.festival.count({ where }),
  ]);

  return {
    festivals,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

export async function getFestivalById(id) {
  return prisma.festival.findUnique({
    where: { id },
    include: {
      schedules: { orderBy: { start_time: "asc" } },
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      files: true,
    },
  });
}

export async function getApprovedFestivalById(id) {
  const fixtureCatalog = getDiscoveryE2eFestivalCatalog();
  if (fixtureCatalog !== undefined) {
    return mapPublicFestival(fixtureCatalog.find((festival) => festival.id === id) || null);
  }

  const festival = await prisma.festival.findFirst({
    where: { id, status: FESTIVAL_STATUS.APPROVED },
    select: PUBLIC_FESTIVAL_SELECT,
  });

  return mapPublicFestival(festival);
}

export async function getPublicFestivalBySlug(slug) {
  const fixture = getDiscoveryE2eFestival(slug);
  if (fixture !== undefined) return mapPublicFestival(fixture);

  const festival = await prisma.festival.findFirst({
    where: { slug, status: FESTIVAL_STATUS.APPROVED },
    select: PUBLIC_FESTIVAL_SELECT,
  });

  return mapPublicFestival(festival);
}

export async function getPublicFestivalCatalog() {
  const fixture = getDiscoveryE2eFestivalCatalog();
  if (fixture !== undefined) return fixture.map(mapPublicFestival);

  const festivals = await prisma.festival.findMany({
    where: { status: FESTIVAL_STATUS.APPROVED },
    select: PUBLIC_FESTIVAL_SELECT,
    orderBy: { start_date: "asc" },
  });

  return festivals.map(mapPublicFestival);
}

// Public callers must use the approved-only DTO. Private admin lookups remain ID-based.
export const getFestivalBySlug = getPublicFestivalBySlug;

export async function createFestival(data) {
  let slug = data.slug || generateSlug(data.name);

  const existing = await prisma.festival.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now()}`;
  }

  return prisma.festival.create({
    data: {
      ...data,
      slug,
      status: FESTIVAL_STATUS.PENDING,
    },
  });
}

export async function updateFestival(id, data) {
  return prisma.festival.update({
    where: { id },
    data,
  });
}

export async function deleteFestival(id) {
  return prisma.festival.delete({
    where: { id },
  });
}

export async function approveFestival(id, status, reason, actorUserId, expectedRevision) {
  if (!actorUserId) throw new Error("Authenticated moderation actor is required.");
  const workflowState = status === FESTIVAL_STATUS.APPROVED ? "approved" : "rejected";
  return prisma.$transaction(async (transaction) => {
    const current = await transaction.festival.findUnique({
      where: { id },
      select: { id: true, workflow_state: true, status: true, revision: true },
    });
    if (!current) return null;
    if (
      current.workflow_state !== "pending_review"
      || current.status !== FESTIVAL_STATUS.PENDING
      || current.revision !== expectedRevision
    ) {
      throw new ConflictError("Festival is not pending review at the expected revision");
    }

    const nextRevision = expectedRevision + 1;
    const changed = await transaction.festival.updateMany({
      where: {
        id,
        workflow_state: "pending_review",
        status: FESTIVAL_STATUS.PENDING,
        revision: expectedRevision,
      },
      data: {
        status,
        workflow_state: workflowState,
        revision: nextRevision,
        rejection_reason: status === FESTIVAL_STATUS.REJECTED ? reason || null : null,
      },
    });
    if (changed.count !== 1) {
      throw new ConflictError("Festival changed while moderation was in progress");
    }

    await transaction.festivalTransition.create({
      data: {
        festival_id: id,
        actor_user_id: actorUserId,
        from_state: "pending_review",
        to_state: workflowState,
        revision: nextRevision,
        reason: status === FESTIVAL_STATUS.REJECTED ? reason || null : null,
      },
    });
    const festival = await transaction.festival.findUnique({ where: { id } });
    return { festival, reason };
  });
}
