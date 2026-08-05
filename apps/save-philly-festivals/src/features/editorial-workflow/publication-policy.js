export const PUBLICATION_STATES = Object.freeze([
  "draft", "pending_review", "changes_requested", "approved", "rejected",
  "published", "unpublished", "canceled", "archived",
]);

export const publishedDiscoveryWhere = Object.freeze({ workflow_state: "published" });
export const publishedSelectionWhere = publishedDiscoveryWhere;
export const publicDetailWhere = Object.freeze({
  OR: [
    { workflow_state: "published" },
    { workflow_state: "canceled", first_published_at: { not: null } },
  ],
});
export const calendarSelectionWhere = publicDetailWhere;

export function isPubliclyDiscoverable(record) {
  return record?.workflow_state === "published";
}

export function isPublicDetailAvailable(record) {
  return isPubliclyDiscoverable(record)
    || (record?.workflow_state === "canceled" && Boolean(record?.first_published_at));
}

export function isPublicSelectionAvailable(record) {
  return isPubliclyDiscoverable(record);
}

export function isCalendarSelectionAvailable(record) {
  return isPublicDetailAvailable(record);
}

export function isCancellationTombstone(record) {
  return record?.workflow_state === "canceled" && Boolean(record?.first_published_at);
}
