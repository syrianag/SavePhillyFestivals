import { selectRenderableSponsors } from "./sponsor-placements";

/* Maps a database row onto the shape `AdSlot` already renders, so the presentation layer did
 * not have to change when placements moved from constants into the database. */
function toPlacement(row) {
  return {
    name: row.name,
    imageUrl: row.image_url || undefined,
    href: row.href || undefined,
    alt: row.alt_text || undefined,
    pillColor: row.pill_color || undefined,
    textColor: row.text_color || undefined,
    width: row.image_width || undefined,
    height: row.image_height || undefined,
  };
}

export async function listSponsors(input, { repository }) {
  return { sponsors: await repository.list(input) };
}

export async function createSponsor(input, { repository }) {
  const { starts_at, ends_at, ...rest } = input;
  return {
    sponsor: await repository.create({
      ...rest,
      starts_at: starts_at ? new Date(starts_at) : null,
      ends_at: ends_at ? new Date(ends_at) : null,
    }),
  };
}

export async function updateSponsor(id, input, { repository }) {
  const data = { ...input };
  for (const key of ["starts_at", "ends_at"]) {
    if (Object.hasOwn(data, key)) data[key] = data[key] ? new Date(data[key]) : null;
  }
  return { sponsor: await repository.update(id, data) };
}

export async function archiveSponsor(id, { repository }) {
  return { sponsor: await repository.archive(id) };
}

/**
 * Renderable placements grouped by slot, for the public ad slots.
 *
 * Returns `null` when the database yields nothing so the caller can fall back to the built-in
 * constants — the footer band must never regress to blank just because no sponsor rows have
 * been created yet.
 */
export async function renderableSponsorsBySlot(slots, { repository, now = new Date() }) {
  const rows = await repository.listRenderable(slots, now);
  if (!rows.length) return null;
  const grouped = {};
  for (const slot of slots) grouped[slot] = [];
  for (const row of rows) grouped[row.slot]?.push(toPlacement(row));
  for (const slot of slots) grouped[slot] = selectRenderableSponsors(grouped[slot]);
  return grouped;
}
