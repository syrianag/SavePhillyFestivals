import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let createGoogleDriveClient;
let GoogleDriveUploadError;
beforeAll(async () => {
  ({ createGoogleDriveClient, GoogleDriveUploadError } = await import("@/lib/google-drive"));
});

const upload = {
  bytes: new Uint8Array([1, 2, 3]),
  serverFilename: "server-id.png",
  mimeType: "image/png",
  checksumSha256: "a".repeat(64),
};
const scanner = { scan: vi.fn(async () => ({ clean: true })) };
const serviceEmail = "uploader@example.iam.gserviceaccount.com";

function transport({
  result = { id: "drive-private-id", md5Checksum: "provider-checksum", version: "7" },
  metadata = { id: "fixed-private-folder", mimeType: "application/vnd.google-apps.folder", trashed: false, capabilities: { canAddChildren: true } },
  permissions = [{ type: "user", role: "writer", emailAddress: serviceEmail }],
} = {}) {
  return {
    getFile: vi.fn(async () => metadata),
    listPermissions: vi.fn(async () => permissions),
    upload: vi.fn(async () => result),
    delete: vi.fn(async () => undefined),
  };
}

function client(overrides = {}) {
  return createGoogleDriveClient({
    enabled: true,
    folderId: "fixed-private-folder",
    clientEmail: serviceEmail,
    scanner,
    transport: transport(),
    ...overrides,
  });
}

describe("private Google Drive boundary", () => {
  it("fails closed unless feature, actual scanner, fixed folder, and full transport are configured", async () => {
    await expect(client({ enabled: false }).uploadPrivate(upload)).rejects.toMatchObject({ code: "provider_unconfigured" });
    await expect(client({ scanner: null }).uploadPrivate(upload)).rejects.toMatchObject({ code: "provider_unconfigured" });
    await expect(client({ folderId: "" }).uploadPrivate(upload)).rejects.toBeInstanceOf(GoogleDriveUploadError);
    await expect(client({ transport: { upload: vi.fn(), delete: vi.fn() } }).uploadPrivate(upload)).rejects.toMatchObject({ code: "provider_unconfigured" });
  });

  it.each([
    ["anyone permission", [{ type: "anyone", role: "reader", allowFileDiscovery: false }]],
    ["domain permission", [{ type: "domain", role: "reader", domain: "example.org" }]],
    ["unrelated user", [{ type: "user", role: "writer", emailAddress: "other@example.org" }]],
    ["read-only service account", [{ type: "user", role: "reader", emailAddress: serviceEmail }]],
  ])("rejects a folder with %s", async (_label, permissions) => {
    const injected = transport({ permissions });
    const drive = client({ transport: injected });
    await expect(drive.isOperational()).resolves.toBe(false);
    await expect(drive.uploadPrivate(upload)).rejects.toMatchObject({ code: "provider_unconfigured" });
    expect(injected.upload).not.toHaveBeenCalled();
  });

  it("rejects wrong, trashed, non-folder, and non-writable folder metadata", async () => {
    for (const metadata of [
      { id: "different", mimeType: "application/vnd.google-apps.folder", trashed: false, capabilities: { canAddChildren: true } },
      { id: "fixed-private-folder", mimeType: "application/vnd.google-apps.folder", trashed: true, capabilities: { canAddChildren: true } },
      { id: "fixed-private-folder", mimeType: "image/png", trashed: false, capabilities: { canAddChildren: true } },
      { id: "fixed-private-folder", mimeType: "application/vnd.google-apps.folder", trashed: false, capabilities: { canAddChildren: false } },
    ]) {
      await expect(client({ transport: transport({ metadata }) }).isOperational()).resolves.toBe(false);
    }
  });

  it("verifies and caches restricted folder access, scans bytes, uploads only there, and supports delete", async () => {
    let now = 1_000;
    const injected = transport();
    const drive = client({ transport: injected, now: () => now, verificationCacheMs: 10_000 });
    await expect(drive.isOperational()).resolves.toBe(true);
    const result = await drive.uploadPrivate(upload);
    expect(injected.getFile).toHaveBeenCalledTimes(1);
    expect(injected.listPermissions).toHaveBeenCalledTimes(1);
    expect(scanner.scan).toHaveBeenCalledWith(expect.objectContaining({ bytes: upload.bytes, checksumSha256: upload.checksumSha256 }));
    expect(injected.upload).toHaveBeenCalledWith(expect.objectContaining({
      parents: ["fixed-private-folder"], supportsAllDrives: true, visibility: "private", name: "server-id.png",
    }));
    expect(result).toEqual({ driveFileId: "drive-private-id", metadata: { md5Checksum: "provider-checksum", version: "7" } });
    expect(JSON.stringify(result)).not.toMatch(/url|link|permission/i);
    await drive.deletePrivate(result.driveFileId);
    expect(injected.delete).toHaveBeenCalledWith({ id: "drive-private-id", supportsAllDrives: true });
    now += 10_001;
    await drive.isOperational();
    expect(injected.getFile).toHaveBeenCalledTimes(2);
  });

  it("rejects scanner failures and provider responses without a durable file ID", async () => {
    const rejectedScanner = { scan: vi.fn(async () => ({ clean: false })) };
    const injected = transport();
    await expect(client({ scanner: rejectedScanner, transport: injected }).uploadPrivate(upload)).rejects.toMatchObject({ code: "scanner_rejected" });
    expect(injected.upload).not.toHaveBeenCalled();

    await expect(client({ transport: transport({ result: { webViewLink: "https://example.com" } }) }).uploadPrivate(upload)).rejects.toMatchObject({ code: "provider_error" });
  });
});
