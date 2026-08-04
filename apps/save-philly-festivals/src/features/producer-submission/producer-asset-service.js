import { randomUUID } from "node:crypto";

import { ProducerSubmissionError } from "./producer-submission-errors";
import { preparePrivateAsset } from "./producer-submission-upload";

export async function uploadPrivateFestivalAsset(festivalId, file, metadata, {
  repository,
  provider,
  user,
  now = () => new Date(),
  createId,
  createReconciliationMarker = randomUUID,
  logger = console,
}) {
  await repository.assertOwnedEditable(user.id, festivalId);
  const asset = await preparePrivateAsset(file, metadata, { ...(createId ? { createId } : {}) });
  const providerResult = await provider.uploadPrivate({
    bytes: asset.bytes,
    serverFilename: asset.serverFilename,
    mimeType: asset.mimeType,
    checksumSha256: asset.checksumSha256,
  });
  try {
    return await repository.createPrivateAsset({
      ownerUserId: user.id,
      festivalId,
      asset,
      providerResult,
      acknowledgedAt: now(),
    });
  } catch (persistenceError) {
    try {
      await provider.deletePrivate(providerResult.driveFileId);
    } catch {
      const marker = createReconciliationMarker();
      try {
        await repository.recordFailedAssetCleanup({
          marker,
          providerFileId: providerResult.driveFileId,
          serverFilename: asset.serverFilename,
          checksumSha256: asset.checksumSha256,
          attemptedAt: now(),
        });
        logger.error(`[PRODUCER ASSET RECONCILIATION] cleanup_failed marker=${marker}; restricted record persisted.`);
      } catch {
        logger.error(`[PRODUCER ASSET RECONCILIATION] cleanup_failed marker=${marker}; restricted record persistence failed; identifiers redacted.`);
      }
      throw new ProducerSubmissionError(
        "Asset persistence failed and private storage cleanup requires reconciliation.",
        500,
        "upload_cleanup_failed",
      );
    }
    throw persistenceError;
  }
}

// Restricted operations boundary. Callers must authenticate/authorize independently and
// should expose only the opaque marker, never provider identifiers or stored filenames.
export async function retryPrivateAssetReconciliation(marker, {
  repository,
  provider,
  now = () => new Date(),
}) {
  const record = await repository.claimAssetReconciliation({ marker, attemptedAt: now() });
  if (!record) return { claimed: false, cleaned: false };

  try {
    await provider.deletePrivate(record.provider_file_id);
    const cleanedAt = now();
    const updated = await repository.markAssetReconciliationCleaned({ id: record.id, cleanedAt });
    return { claimed: true, cleaned: updated.count === 1 };
  } catch {
    await repository.markAssetReconciliationFailed({ id: record.id });
    return { claimed: true, cleaned: false };
  }
}
