import "server-only";

import { createPrivateKey, randomBytes, sign } from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const MAX_VERIFICATION_CACHE_MS = 5 * 60_000;
const ALLOWED_FOLDER_ROLES = new Set(["owner", "organizer", "fileOrganizer", "writer"]);

export class GoogleDriveUploadError extends Error {
  constructor(code = "provider_unconfigured") {
    super("Private asset provider is unavailable.");
    this.name = "GoogleDriveUploadError";
    this.code = code;
  }
}

function configured(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

export function createGoogleServiceAccountTransport({
  clientEmail,
  privateKey,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
} = {}) {
  let tokenCache = null;

  async function accessToken() {
    if (tokenCache?.expiresAt > now() + 60_000) return tokenCache.value;
    if (!configured(clientEmail) || !configured(privateKey) || typeof fetchImpl !== "function") {
      throw new GoogleDriveUploadError("provider_unconfigured");
    }
    const issuedAt = Math.floor(now() / 1000);
    const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claims = base64url(JSON.stringify({
      iss: clientEmail.trim(),
      scope: DRIVE_SCOPE,
      aud: TOKEN_URL,
      iat: issuedAt,
      exp: issuedAt + 3600,
    }));
    let signature;
    try {
      const key = createPrivateKey(privateKey.replace(/\\n/g, "\n"));
      signature = sign("RSA-SHA256", Buffer.from(`${header}.${claims}`), key).toString("base64url");
    } catch {
      throw new GoogleDriveUploadError("provider_unconfigured");
    }
    const response = await fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claims}.${signature}` }),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    if (!response?.ok) throw new GoogleDriveUploadError("provider_error");
    const body = await response.json().catch(() => null);
    if (!configured(body?.access_token)) throw new GoogleDriveUploadError("provider_error");
    tokenCache = { value: body.access_token, expiresAt: now() + Math.min(Number(body.expires_in) || 3600, 3600) * 1000 };
    return tokenCache.value;
  }

  async function authorizedJson(url) {
    const token = await accessToken();
    const response = await fetchImpl(url, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    if (!response?.ok) throw new GoogleDriveUploadError("provider_error");
    return response.json().catch(() => { throw new GoogleDriveUploadError("provider_error"); });
  }

  return Object.freeze({
    getFile({ id }) {
      return authorizedJson(`${DRIVE_FILES_URL}/${encodeURIComponent(id)}?supportsAllDrives=true&fields=id,mimeType,trashed,driveId,capabilities(canAddChildren)`);
    },

    async listPermissions({ id }) {
      const body = await authorizedJson(`${DRIVE_FILES_URL}/${encodeURIComponent(id)}/permissions?supportsAllDrives=true&fields=permissions(id,type,role,emailAddress,domain,allowFileDiscovery,deleted,pendingOwner)`);
      return body?.permissions;
    },

    async upload({ bytes, name, mimeType, parents }) {
      const token = await accessToken();
      const boundary = `spf-${randomBytes(18).toString("hex")}`;
      const prefix = Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name, mimeType, parents })}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`);
      const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
      const response = await fetchImpl(`${DRIVE_UPLOAD_URL}?uploadType=multipart&supportsAllDrives=true&fields=id,md5Checksum,version`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": `multipart/related; boundary=${boundary}`,
        },
        body: Buffer.concat([prefix, Buffer.from(bytes), suffix]),
        signal: AbortSignal.timeout(30_000),
      }).catch(() => null);
      if (!response?.ok) throw new GoogleDriveUploadError("provider_error");
      return response.json().catch(() => { throw new GoogleDriveUploadError("provider_error"); });
    },

    async delete({ id }) {
      const token = await accessToken();
      const response = await fetchImpl(`${DRIVE_FILES_URL}/${encodeURIComponent(id)}?supportsAllDrives=true`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10_000),
      }).catch(() => null);
      if (!response?.ok && response?.status !== 404) throw new GoogleDriveUploadError("provider_error");
    },
  });
}

function folderAccessIsRestricted(metadata, permissions, folderId, clientEmail) {
  if (
    metadata?.id !== folderId
    || metadata.mimeType !== FOLDER_MIME_TYPE
    || metadata.trashed !== false
    || metadata.capabilities?.canAddChildren !== true
    || !Array.isArray(permissions)
    || permissions.length === 0
  ) return false;

  const expectedEmail = clientEmail.trim().toLowerCase();
  return permissions.every((permission) => (
    permission?.type === "user"
    && permission.deleted !== true
    && permission.pendingOwner !== true
    && configured(permission.emailAddress)
    && permission.emailAddress.trim().toLowerCase() === expectedEmail
    && ALLOWED_FOLDER_ROLES.has(permission.role)
  ));
}

export function createGoogleDriveClient({
  enabled = process.env.GOOGLE_DRIVE_UPLOADS_ENABLED === "1",
  folderId = process.env.GOOGLE_DRIVE_PRIVATE_FOLDER_ID,
  clientEmail = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL,
  privateKey = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY,
  scanner,
  transport,
  now = () => Date.now(),
  verificationCacheMs = MAX_VERIFICATION_CACHE_MS,
} = {}) {
  const activeTransport = transport || (configured(clientEmail) && configured(privateKey)
    ? createGoogleServiceAccountTransport({ clientEmail, privateKey })
    : null);
  const fixedFolderId = configured(folderId) ? folderId.trim() : null;
  const fixedClientEmail = configured(clientEmail) ? clientEmail.trim() : null;
  const storageBoundary = enabled && fixedFolderId && fixedClientEmail
    && typeof activeTransport?.getFile === "function"
    && typeof activeTransport?.listPermissions === "function"
    && typeof activeTransport?.upload === "function"
    && typeof activeTransport?.delete === "function";
  const cacheTtl = Math.max(0, Math.min(Number(verificationCacheMs) || 0, MAX_VERIFICATION_CACHE_MS));
  let verifiedUntil = 0;
  let verificationPromise = null;

  async function verifyStorage() {
    if (!storageBoundary) return false;
    if (verifiedUntil > now()) return true;
    if (verificationPromise) return verificationPromise;
    verificationPromise = (async () => {
      try {
        const [metadata, permissions] = await Promise.all([
          activeTransport.getFile({ id: fixedFolderId, supportsAllDrives: true }),
          activeTransport.listPermissions({ id: fixedFolderId, supportsAllDrives: true }),
        ]);
        const verified = folderAccessIsRestricted(metadata, permissions, fixedFolderId, fixedClientEmail);
        if (verified) verifiedUntil = now() + cacheTtl;
        return verified;
      } catch {
        return false;
      } finally {
        verificationPromise = null;
      }
    })();
    return verificationPromise;
  }

  return Object.freeze({
    async isOperational() {
      return typeof scanner?.scan === "function" && await verifyStorage();
    },

    async uploadPrivate({ bytes, serverFilename, mimeType, checksumSha256 }) {
      if (typeof scanner?.scan !== "function" || !await verifyStorage()) {
        throw new GoogleDriveUploadError("provider_unconfigured");
      }
      const scanResult = await scanner.scan({ bytes, mimeType, checksumSha256 }).catch(() => null);
      if (scanResult?.clean !== true) throw new GoogleDriveUploadError("scanner_rejected");
      const result = await activeTransport.upload({
        bytes,
        name: serverFilename,
        mimeType,
        checksumSha256,
        parents: [fixedFolderId],
        supportsAllDrives: true,
        visibility: "private",
      });
      if (!configured(result?.id)) throw new GoogleDriveUploadError("provider_error");
      return Object.freeze({
        driveFileId: result.id,
        metadata: {
          md5Checksum: configured(result.md5Checksum) ? result.md5Checksum : null,
          version: configured(result.version) ? result.version : null,
        },
      });
    },

    async deletePrivate(driveFileId) {
      if (!await verifyStorage() || !configured(driveFileId)) throw new GoogleDriveUploadError("provider_unconfigured");
      await activeTransport.delete({ id: driveFileId, supportsAllDrives: true });
    },
  });
}

// Disabled by default. There is intentionally no production scanner implementation in
// this tree, so the exported client remains non-operational even if enablement flags exist.
export const googleDriveClient = createGoogleDriveClient();
