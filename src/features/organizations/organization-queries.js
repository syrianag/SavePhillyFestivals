import { prisma } from "@/lib/db";

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function getOrganizations({ page = 1, limit = 50, search } = {}) {
  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * limit;

  const [organizations, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      include: {
        _count: { select: { festivals: true } },
      },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.organization.count({ where }),
  ]);

  return {
    organizations,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

export async function getOrganizationById(id) {
  return prisma.organization.findUnique({
    where: { id },
    include: {
      festivals: {
        include: {
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
        },
        orderBy: { start_date: "asc" },
      },
    },
  });
}

export async function getOrganizationBySlug(slug) {
  return prisma.organization.findUnique({
    where: { slug },
    include: {
      festivals: {
        where: { status: "approved" },
        include: {
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
        },
        orderBy: { start_date: "asc" },
      },
    },
  });
}

export async function createOrganization(data) {
  let slug = data.slug || generateSlug(data.name);
  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now()}`;
  }
  return prisma.organization.create({
    data: { ...data, slug },
  });
}

export async function updateOrganization(id, data) {
  return prisma.organization.update({
    where: { id },
    data,
  });
}

export async function deleteOrganization(id) {
  return prisma.organization.delete({
    where: { id },
  });
}
