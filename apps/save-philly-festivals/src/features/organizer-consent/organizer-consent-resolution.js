export function parentFestivalIds(items, approvedFestivals, approvedEvents) {
  const approvedFestivalIds = new Set(approvedFestivals.map(({ id }) => id));
  const eventParents = new Map(approvedEvents.map(({ id, festival_id, festival }) => [id, festival_id || festival?.id]));
  const ids = [];
  for (const item of items) {
    const id = item.type === "festival"
      ? (approvedFestivalIds.has(item.id) ? item.id : null)
      : eventParents.get(item.id);
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

export function eligibleOrganizerResult(parentIds, integrations) {
  const parentSet = new Set(parentIds);
  return integrations
    .filter((record) => parentSet.has(record.festival_id) && record.enabled && record.authorization_status === "authorized")
    .map(({ id, organizer_name, festival_id, festival }) => ({
      id,
      name: organizer_name,
      festival_id,
      festival_name: festival?.name,
    }));
}
