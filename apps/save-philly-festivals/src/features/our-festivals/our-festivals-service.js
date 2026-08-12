import { OurFestivalItemNotFoundError } from "./our-festivals-repository";

export async function listOurFestivalItems(input, { repository }) {
  return { items: await repository.list(input) };
}

export async function getOurFestivalItem(id, { repository }) {
  const item = await repository.findById(id);
  if (!item) throw new OurFestivalItemNotFoundError();
  return item;
}

export async function createOurFestivalItem(input, { repository }) {
  /* A curator who does not set an explicit position gets appended rather than tied at 0. The
   * schema default of 0 only applies when the field is absent from the request body. */
  const sort_order = Object.hasOwn(input, "sort_order") && input.sort_order !== 0
    ? input.sort_order
    : await repository.nextSortOrder();
  return { item: await repository.create({ ...input, sort_order }) };
}

export async function updateOurFestivalItem(id, input, { repository }) {
  return { item: await repository.update(id, input) };
}

export async function archiveOurFestivalItem(id, { repository }) {
  return { item: await repository.archive(id) };
}

export async function reorderOurFestivalItems({ order }, { repository }) {
  return { items: await repository.applyOrder(order) };
}

/**
 * Public gallery contents.
 *
 * Two visibility rules apply and they are deliberately different:
 *
 *  - The item itself must be `published`. This model does not participate in
 *    `FestivalWorkflowState`, so `publishedDiscoveryWhere` is not the gate here.
 *  - The *link* to a festival is suppressed unless that festival is itself publicly viewable.
 *    A curated photo of a draft festival is fine to show; a link that 404s for the public is
 *    not, so the item renders without its "read more" affordance instead of being hidden.
 */
export async function publicOurFestivalItems({ repository }) {
  const rows = await repository.listPublished();
  return rows.map(({ festival, ...item }) => ({
    ...item,
    festival: festival && festival.workflow_state === "published"
      ? { name: festival.name, slug: festival.slug }
      : null,
  }));
}
