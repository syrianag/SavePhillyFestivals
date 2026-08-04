import { prisma } from "@/lib/db";
import { FESTIVAL_STATUS } from "@/lib/constants";

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
  return prisma.festival.findFirst({
    where: { id, status: FESTIVAL_STATUS.APPROVED },
    include: {
      schedules: { orderBy: { start_time: "asc" } },
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      files: true,
    },
  });
}

export async function getFestivalBySlug(slug) {
  return prisma.festival.findUnique({
    where: { slug },
    include: {
      schedules: { orderBy: { start_time: "asc" } },
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      files: true,
    },
  });
}

export async function getApprovedFestivalBySlug(slug) {
  return prisma.festival.findFirst({
    where: { slug, status: FESTIVAL_STATUS.APPROVED },
    include: {
      schedules: { orderBy: { start_time: "asc" } },
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      files: true,
    },
  });
}

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

export async function approveFestival(id, status, reason) {
  const data = { status };
  if (reason) {
    data.rejection_reason = reason;
  }
  const festival = await prisma.festival.update({
    where: { id },
    data,
  });
  return { festival, reason };
}
