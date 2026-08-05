export const FESTIVAL_REVISION_SNAPSHOT_FIELDS = Object.freeze([
  "id",
  "name",
  "slug",
  "description",
  "location",
  "city",
  "state",
  "zip_code",
  "website_url",
  "logo_url",
  "image_url",
  "rejection_reason",
  "submitted_by",
  "contact_name",
  "contact_email",
  "contact_phone",
  "host_name",
  "host_title",
  "host_about",
  "host_social",
  "social_instagram",
  "social_facebook",
  "social_twitter",
  "social_tiktok",
  "social_youtube",
  "festival_age",
  "festival_age_details",
  "org_type",
  "story",
  "mission",
  "history",
  "calendar_date_type",
  "time_zone",
  "start_date",
  "end_date",
  "all_day_start",
  "all_day_end",
  "calendar_status",
  "calendar_sequence",
  "calendar_published_at",
  "first_published_at",
  "published_at",
  "canceled_at",
  "public_message",
  "workflow_state",
  "revision",
]);

export const FESTIVAL_REVISION_SNAPSHOT_SELECT = Object.freeze(
  Object.fromEntries(FESTIVAL_REVISION_SNAPSHOT_FIELDS.map((field) => [field, true])),
);

export function buildFestivalRevisionSnapshot(festival) {
  return Object.fromEntries(FESTIVAL_REVISION_SNAPSHOT_FIELDS.map((field) => {
    const value = festival[field];
    return [field, value instanceof Date ? value.toISOString() : value ?? null];
  }));
}
