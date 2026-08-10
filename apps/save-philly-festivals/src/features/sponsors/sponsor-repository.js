import { prisma } from "@/lib/db";

export class SponsorNotFoundError extends Error {
  constructor() { super("Sponsor not found."); this.statusCode = 404; this.code = "not_found"; }
}

const sponsorSelect = {
  id: true,
  name: true,
  slot: true,
  status: true,
  sort_order: true,
  href: true,
  alt_text: true,
  image_url: true,
  image_width: true,
  image_height: true,
  pill_color: true,
  text_color: true,
  starts_at: true,
  ends_at: true,
  created_at: true,
  updated_at: true,
};

export const sponsorRepository = {
  list({ slot, status } = {}) {
    return prisma.sponsor.findMany({
      where: { ...(slot ? { slot } : {}), ...(status ? { status } : {}) },
      select: sponsorSelect,
      orderBy: [{ slot: "asc" }, { sort_order: "asc" }, { created_at: "asc" }],
    });
  },

  /**
   * Sponsors eligible to render right now: active, and inside their flight window if one is
   * set. A sponsorship that has ended stops rendering without anyone having to remember to
   * archive it.
   */
  listRenderable(slots, now = new Date()) {
    return prisma.sponsor.findMany({
      where: {
        slot: { in: slots },
        status: "active",
        AND: [
          { OR: [{ starts_at: null }, { starts_at: { lte: now } }] },
          { OR: [{ ends_at: null }, { ends_at: { gt: now } }] },
        ],
      },
      select: sponsorSelect,
      orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
    });
  },

  create(data) {
    return prisma.sponsor.create({ data, select: sponsorSelect });
  },

  async update(id, data) {
    const updated = await prisma.sponsor.updateMany({ where: { id }, data });
    if (updated.count !== 1) throw new SponsorNotFoundError();
    return prisma.sponsor.findUnique({ where: { id }, select: sponsorSelect });
  },

  /* Archive rather than delete, matching how festivals are retired: a sponsor row is a record
   * of a paid placement and should stay auditable. */
  async archive(id) {
    const updated = await prisma.sponsor.updateMany({ where: { id }, data: { status: "archived" } });
    if (updated.count !== 1) throw new SponsorNotFoundError();
    return prisma.sponsor.findUnique({ where: { id }, select: sponsorSelect });
  },
};
