const FESTIVAL_RESPONSE_FIELDS = Object.freeze([
  "id", "name", "description", "location", "city", "state", "zip_code",
  "contact_name", "contact_email", "contact_phone", "website_url",
  "calendar_date_type", "time_zone", "start_date", "end_date",
  "all_day_start", "all_day_end", "workflow_state", "revision",
  "created_at", "updated_at", "workflow_transitions",
]);

export function presentProducerFestival(festival) {
  const presented = Object.fromEntries(FESTIVAL_RESPONSE_FIELDS.map((field) => [field, festival[field] ?? null]));
  presented.workflow_transitions = (festival.workflow_transitions || []).map((item) => ({
    from_state: item.from_state,
    to_state: item.to_state,
    revision: item.revision,
    producer_message: item.producer_message || null,
    created_at: item.created_at,
  }));
  return presented;
}

export function presentFestivalAsset(asset) {
  return {
    id: asset.id,
    festival_id: asset.festival_id,
    server_filename: asset.server_filename,
    mime_type: asset.mime_type,
    byte_size: asset.byte_size,
    checksum_sha256: asset.checksum_sha256,
    purpose: asset.purpose,
    alt_text: asset.alt_text,
    rights_version: asset.rights_version,
    scan_status: asset.scan_status,
    lifecycle_status: asset.lifecycle_status,
    created_at: asset.created_at,
  };
}
