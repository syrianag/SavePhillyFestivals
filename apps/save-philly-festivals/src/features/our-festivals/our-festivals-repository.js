import { prisma } from "@/lib/db";

export class OurFestivalItemNotFoundError extends Error {
  constructor() { super("Gallery item not found."); this.statusCode = 404; this.code = "not_found"; }
}

const itemSelect = {
  id: true,
  title: true,
  caption: true,
  festival_id: true,
  image_url: true,
  image_width: true,
  image_height: true,
  alt_text: true,
  status: true,
  sort_order: true,
  created_at: true,
  updated_at: true,
  festival: { select: { id: true, name: true, slug: true, workflow_state: true } },
};

/* Ordering is total: sort_order, then created_at, then id. Without the final tiebreak two rows
 * created in the same millisecond could swap places between requests, which reads as the
 * gallery shuffling itself. */
const itemOrderBy = [{ sort_order: "asc" }, { created_at: "asc" }, { id: "asc" }];

export const ourFestivalsRepository = {
  list({ status } = {}) {
    return prisma.ourFestivalItem.findMany({
      where: status ? { status } : {},
      select: itemSelect,
      orderBy: itemOrderBy,
    });
  },

  /** Public gallery contents. Only `published` items, never drafts or archived ones. */
  listPublished() {
    return prisma.ourFestivalItem.findMany({
      where: { status: "published" },
      select: itemSelect,
      orderBy: itemOrderBy,
    });
  },

  findById(id) {
    return prisma.ourFestivalItem.findUnique({ where: { id }, select: itemSelect });
  },

  create(data) {
    return prisma.ourFestivalItem.create({ data, select: itemSelect });
  },

  async update(id, data) {
    const updated = await prisma.ourFestivalItem.updateMany({ where: { id }, data });
    if (updated.count !== 1) throw new OurFestivalItemNotFoundError();
    return prisma.ourFestivalItem.findUnique({ where: { id }, select: itemSelect });
  },

  /* Archive rather than hard delete, matching how sponsors and festivals retire: the row keeps
   * its audit trail and can be restored if a curator archives the wrong item. */
  async archive(id) {
    const updated = await prisma.ourFestivalItem.updateMany({ where: { id }, data: { status: "archived" } });
    if (updated.count !== 1) throw new OurFestivalItemNotFoundError();
    return prisma.ourFestivalItem.findUnique({ where: { id }, select: itemSelect });
  },

  /**
   * Apply a whole ordering atomically.
   *
   * One transaction so a partial write cannot leave the gallery in an order the curator never
   * chose. `updateMany` per id (rather than `update`) means an id deleted mid-drag is a no-op
   * instead of throwing and rolling back everyone else's move.
   */
  async applyOrder(ids) {
    await prisma.$transaction(
      ids.map((id, index) => prisma.ourFestivalItem.updateMany({ where: { id }, data: { sort_order: index } })),
    );
    return prisma.ourFestivalItem.findMany({ select: itemSelect, orderBy: itemOrderBy });
  },

  /* Next free slot, so a newly created item lands at the end of the gallery instead of
   * colliding with whatever already sits at sort_order 0. */
  async nextSortOrder() {
    const last = await prisma.ourFestivalItem.findFirst({ orderBy: { sort_order: "desc" }, select: { sort_order: true } });
    return last ? last.sort_order + 1 : 0;
  },
};
