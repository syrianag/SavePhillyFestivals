export function isPublicAssetEligible(asset, festival) {
  return festival?.workflow_state === "published"
    && asset?.scan_status === "clean"
    && asset?.lifecycle_status === "active"
    && asset?.editorial_status === "approved"
    && Number.isInteger(asset?.rights_version)
    && asset.rights_version > 0
    && typeof asset?.alt_text === "string"
    && asset.alt_text.trim().length > 0;
}

export const PUBLIC_ASSET_ELIGIBILITY_WHERE = Object.freeze({
  scan_status: "clean",
  lifecycle_status: "active",
  editorial_status: "approved",
  rights_version: { gt: 0 },
  alt_text: { not: "" },
  festival: { workflow_state: "published" },
});
