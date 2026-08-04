import { describe, expect, it, vi } from "vitest";

import {
  retryPrivateAssetReconciliation,
  uploadPrivateFestivalAsset,
} from "@/features/producer-submission/producer-asset-service";
import { presentFestivalAsset } from "@/features/producer-submission/producer-submission-presenter";
import { preparePrivateAsset } from "@/features/producer-submission/producer-submission-upload";

const festivalId = "8fe0c269-81d1-412c-a3c4-a73c940f8f36";
const user = { id: "efce8c4b-ee6e-4da9-8fdd-54f187938a45", email: "producer@example.com" };
const metadata = { purpose: "hero_image", alt_text: "Crowds enjoying the festival", rights_acknowledged: "true", rights_version: "1" };
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xda, 0x00, 0x08, 1, 1, 0, 0, 0, 0, 0, 0xff, 0xd9]);
const WEBP = Buffer.from([0x52,0x49,0x46,0x46,22,0,0,0,0x57,0x45,0x42,0x50,0x56,0x50,0x38,0x58,10,0,0,0,0,0,0,0,0,0,0,0,0,0]);

function file(bytes, type, name = "client-name.jpg") {
  return new File([bytes], name, { type });
}

describe("private asset validation", () => {
  it("structurally parses bounded JPEG/PNG/WebP images and ignores client names for storage", async () => {
    for (const [input, extension] of [[file(JPEG, "image/jpeg"), "jpg"], [file(PNG, "image/png", "x.png"), "png"], [file(WEBP, "image/webp", "x.webp"), "webp"]]) {
      const asset = await preparePrivateAsset(input, metadata, { createId: () => "server-generated-id" });
      expect(asset.serverFilename).toBe(`server-generated-id.${extension}`);
      expect(asset.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(asset).toMatchObject({ width: 1, height: 1, originalFilename: input.name });
    }
  });

  it("rejects spoofed, truncated, oversized-dimension, and unsupported images", async () => {
    await expect(preparePrivateAsset(file(PNG.subarray(0, 24), "image/png"), metadata)).rejects.toMatchObject({ code: "invalid_asset_structure" });
    const hugePng = Buffer.from(PNG);
    hugePng.writeUInt32BE(20_000, 16);
    await expect(preparePrivateAsset(file(hugePng, "image/png"), metadata)).rejects.toMatchObject({ code: "invalid_asset_structure" });
    await expect(preparePrivateAsset(file([1, 2, 3], "image/gif", "x.gif"), metadata)).rejects.toMatchObject({ code: "invalid_asset_type" });
  });

  it("checks ownership before provider work and persists no public URL", async () => {
    const repository = {
      assertOwnedEditable: vi.fn(async () => true),
      createPrivateAsset: vi.fn(async ({ festivalId: id, asset }) => ({
        id: asset.id, festival_id: id, checksum_sha256: asset.checksumSha256, server_filename: asset.serverFilename,
        mime_type: asset.mimeType, byte_size: asset.byteSize, purpose: asset.purpose, alt_text: asset.altText,
        rights_version: asset.rightsVersion, scan_status: "pending", lifecycle_status: "active", created_at: new Date(),
      })),
    };
    const provider = { uploadPrivate: vi.fn(async () => ({ driveFileId: "private-provider-id", metadata: {} })), deletePrivate: vi.fn() };
    const asset = await uploadPrivateFestivalAsset(festivalId, file(PNG, "image/png"), metadata, { repository, provider, user, createId: () => "server-id" });
    expect(provider.uploadPrivate).toHaveBeenCalledAfter(repository.assertOwnedEditable);
    const response = presentFestivalAsset(asset);
    expect(response.checksum_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(response)).not.toMatch(/drive|url|original_filename|provider_metadata/i);
  });

  it("deletes the private provider object after persistence failure", async () => {
    const persistenceError = new Error("database unavailable");
    const repository = { assertOwnedEditable: vi.fn(), createPrivateAsset: vi.fn(async () => { throw persistenceError; }) };
    const provider = { uploadPrivate: vi.fn(async () => ({ driveFileId: "private-id", metadata: {} })), deletePrivate: vi.fn() };
    await expect(uploadPrivateFestivalAsset(festivalId, file(PNG, "image/png"), metadata, { repository, provider, user })).rejects.toBe(persistenceError);
    expect(provider.deletePrivate).toHaveBeenCalledWith("private-id");
  });

  it("persists a restricted reconciliation record and returns only a redacted marker when cleanup fails", async () => {
    const repository = {
      assertOwnedEditable: vi.fn(),
      createPrivateAsset: vi.fn(async () => { throw new Error("db secret"); }),
      recordFailedAssetCleanup: vi.fn(async () => ({ id: "restricted-record" })),
    };
    const provider = { uploadPrivate: vi.fn(async () => ({ driveFileId: "sensitive-drive-id", metadata: {} })), deletePrivate: vi.fn(async () => { throw new Error("provider secret"); }) };
    const logger = { error: vi.fn() };
    await expect(uploadPrivateFestivalAsset(festivalId, file(PNG, "image/png"), metadata, {
      repository, provider, user, logger, createReconciliationMarker: () => "safe-marker",
    })).rejects.toMatchObject({ code: "upload_cleanup_failed", statusCode: 500 });
    expect(repository.recordFailedAssetCleanup).toHaveBeenCalledWith(expect.objectContaining({
      marker: "safe-marker",
      providerFileId: "sensitive-drive-id",
      serverFilename: expect.stringMatching(/\.png$/),
      checksumSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      attemptedAt: expect.any(Date),
    }));
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("marker=safe-marker"));
    expect(logger.error.mock.calls[0][0]).not.toMatch(/sensitive-drive-id|db secret|provider secret/);
  });

  it("claims reconciliation through the restricted retry boundary and records cleanup state", async () => {
    const record = { id: "reconciliation-id", provider_file_id: "restricted-provider-id" };
    const repository = {
      claimAssetReconciliation: vi.fn(async () => record),
      markAssetReconciliationCleaned: vi.fn(async () => ({ count: 1 })),
      markAssetReconciliationFailed: vi.fn(),
    };
    const provider = { deletePrivate: vi.fn(async () => undefined) };
    await expect(retryPrivateAssetReconciliation("opaque-marker", { repository, provider })).resolves.toEqual({ claimed: true, cleaned: true });
    expect(repository.claimAssetReconciliation).toHaveBeenCalledWith(expect.objectContaining({ marker: "opaque-marker" }));
    expect(provider.deletePrivate).toHaveBeenCalledWith("restricted-provider-id");
    expect(repository.markAssetReconciliationCleaned).toHaveBeenCalledWith(expect.objectContaining({ id: "reconciliation-id" }));
  });

  it("returns a safe retry result and leaves failed cleanup retryable", async () => {
    const repository = {
      claimAssetReconciliation: vi.fn(async () => ({ id: "reconciliation-id", provider_file_id: "restricted-provider-id" })),
      markAssetReconciliationCleaned: vi.fn(),
      markAssetReconciliationFailed: vi.fn(async () => ({ count: 1 })),
    };
    const provider = { deletePrivate: vi.fn(async () => { throw new Error("provider detail"); }) };
    await expect(retryPrivateAssetReconciliation("opaque-marker", { repository, provider })).resolves.toEqual({ claimed: true, cleaned: false });
    expect(repository.markAssetReconciliationFailed).toHaveBeenCalledWith({ id: "reconciliation-id" });
  });
});
