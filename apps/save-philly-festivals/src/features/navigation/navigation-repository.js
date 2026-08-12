import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/db";
import { DEFAULT_NAVIGATION_LINKS } from "./navigation-defaults";

export class NavigationLinkNotFoundError extends Error {
  constructor() { super("Navigation link not found."); this.statusCode = 404; this.code = "not_found"; }
}

const linkSelect = {
  id: true,
  placement: true,
  section: true,
  label: true,
  href: true,
  sort_order: true,
  visible: true,
  created_at: true,
  updated_at: true,
};

/* Total ordering: placement, then sort_order, then created_at, then id. Without the final
 * tiebreak two links created in the same millisecond could swap places between requests, which
 * reads as the menu shuffling itself. */
const linkOrderBy = [{ placement: "asc" }, { sort_order: "asc" }, { created_at: "asc" }, { id: "asc" }];

export const navigationRepository = {
  list({ placement } = {}) {
    return prisma.navigationLink.findMany({
      where: placement ? { placement } : {},
      select: linkSelect,
      orderBy: linkOrderBy,
    });
  },

  /** What the public site renders. Hidden links are excluded here, not at the component. */
  listVisible() {
    return prisma.navigationLink.findMany({
      where: { visible: true },
      select: linkSelect,
      orderBy: linkOrderBy,
    });
  },

  create(data) {
    return prisma.navigationLink.create({ data: { id: randomUUID(), ...data }, select: linkSelect });
  },

  async update(id, data) {
    const updated = await prisma.navigationLink.updateMany({ where: { id }, data });
    if (updated.count !== 1) throw new NavigationLinkNotFoundError();
    return prisma.navigationLink.findUnique({ where: { id }, select: linkSelect });
  },

  /* A real delete, unlike sponsors and gallery items. A removed menu entry carries no audit
   * value, and `visible: false` already covers "take it down but keep it". */
  async remove(id) {
    const deleted = await prisma.navigationLink.deleteMany({ where: { id } });
    if (deleted.count !== 1) throw new NavigationLinkNotFoundError();
    return { id };
  },

  /**
   * Apply a whole ordering atomically.
   *
   * One transaction so a partial write cannot leave the menu in an order nobody chose.
   * `updateMany` per id rather than `update` means a link deleted mid-drag is a no-op instead of
   * throwing and rolling back everyone else's move.
   */
  async applyOrder(ids) {
    await prisma.$transaction(
      ids.map((id, index) => prisma.navigationLink.updateMany({ where: { id }, data: { sort_order: index } })),
    );
    return prisma.navigationLink.findMany({ select: linkSelect, orderBy: linkOrderBy });
  },

  /**
   * Materialise the shipped menu the first time an admin opens the screen.
   *
   * Idempotent by count rather than by row: once the table has anything in it, the admin owns the
   * menu and re-seeding would resurrect links they deliberately deleted.
   */
  async ensureDefaults(createdByUserId = null) {
    const existing = await prisma.navigationLink.count();
    if (existing === 0) {
      await prisma.navigationLink.createMany({
        data: DEFAULT_NAVIGATION_LINKS.map((link) => ({
          id: randomUUID(),
          ...link,
          created_by_user_id: createdByUserId,
        })),
      });
    }
    return this.list();
  },
};
