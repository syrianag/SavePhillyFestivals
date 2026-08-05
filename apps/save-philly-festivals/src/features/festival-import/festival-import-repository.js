import { buildFestivalRevisionSnapshot, FESTIVAL_REVISION_SNAPSHOT_SELECT } from "../editorial-workflow/festival-revision-snapshot.js";

const PERSISTED_FAILURE_MESSAGES = Object.freeze({
  apply_failed: "Festival import apply failed; inspect restricted operational diagnostics.",
  category_not_found: "A prepared category is unavailable; no uncommitted row changes were retained.",
  reconciliation_failed: "Festival import reconciliation failed; the batch can be resumed after investigation.",
});

function dateOnly(value) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

async function loadBatch(prisma, where) {
  const batch = await prisma.festivalImportBatch.findUnique({ where });
  if (!batch) return null;
  const rows = await prisma.festivalImportRow.findMany({ where: { batch_id: batch.id }, orderBy: { row_number: "asc" } });
  const issues = await prisma.festivalImportIssue.findMany({
    where: { batch_id: batch.id },
    orderBy: [{ severity: "asc" }, { code: "asc" }],
  });
  const rowById = new Map(rows.map((row) => [row.id, row]));
  const issuesByRow = issues.reduce((grouped, issue) => {
    if (!issue.row_id) return grouped;
    const group = grouped.get(issue.row_id) ?? [];
    group.push(issue);
    grouped.set(issue.row_id, group);
    return grouped;
  }, new Map());
  return {
    ...batch,
    rows: rows.map((row) => ({
      ...row,
      issues: issuesByRow.get(row.id) ?? [],
      duplicate_of_row: row.duplicate_of_row_id ? { row_number: rowById.get(row.duplicate_of_row_id)?.row_number ?? null } : null,
    })),
    issues: issues.filter(({ row_id }) => row_id === null),
  };
}


function countData(counts) {
  return {
    total_row_count: counts.total,
    ready_row_count: counts.ready,
    imported_row_count: counts.imported,
    duplicate_row_count: counts.duplicate,
    quarantined_row_count: counts.quarantined,
    failed_row_count: counts.failed,
    warning_issue_count: counts.warningIssues,
    error_issue_count: counts.errorIssues,
  };
}

export function createFestivalImportRepository(prisma) {
  if (!prisma?.$transaction) throw new TypeError("A Prisma client is required");

  return Object.freeze({
    findOperator(id) {
      return prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    },

    findBatchByChecksum(sourceChecksum) {
      return loadBatch(prisma, { source_checksum_sha256: sourceChecksum });
    },

    findBatchById(id) {
      return loadBatch(prisma, { id });
    },

    async findExistingCandidates(records) {
      if (!records.length) return new Map();
      const candidates = await prisma.festival.findMany({
        where: {
          OR: [
            { slug: { in: [...new Set(records.map(({ slug }) => slug))] } },
            ...[...new Set(records.map(({ applyPayload }) => applyPayload.name).filter(Boolean))]
              .map((name) => ({ name: { equals: name, mode: "insensitive" } })),
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          all_day_start: true,
          occurrences: { where: { is_primary: true }, select: { all_day_start: true }, take: 1 },
        },
      });
      const matches = new Map();
      for (const record of records) {
        const start = record.applyPayload.all_day_start;
        const match = candidates.find((candidate) => {
          if (candidate.slug === record.slug) return true;
          const candidateStart = candidate.occurrences[0]?.all_day_start ?? candidate.all_day_start;
          return candidate.name.localeCompare(record.applyPayload.name, "en-US", { sensitivity: "base" }) === 0
            && candidateStart?.toISOString().slice(0, 10) === start;
        });
        if (match) matches.set(record.recordNumber, { id: match.id });
      }
      return matches;
    },

    async createPreparedBatch(prepared) {
      try {
        await prisma.$transaction(async (transaction) => {
          await transaction.festivalImportBatch.create({
          data: {
            id: prepared.id,
            source_name: prepared.sourceName,
            source_checksum_sha256: prepared.sourceChecksum,
            category_map_checksum_sha256: prepared.categoryMapChecksum,
            prepared_digest_sha256: prepared.preparedDigest,
            prepared_counts: prepared.preparedCounts,
            import_profile: prepared.profileName,
            import_profile_version: prepared.profileVersion,
            environment: prepared.environment,
            operator_user_id: prepared.operatorUserId,
            ...countData(prepared.counts),
          },
        });
          await transaction.festivalImportRow.createMany({
            data: prepared.rows.map((row) => ({
              id: row.id,
              batch_id: prepared.id,
              row_number: row.rowNumber,
              source_record_id: row.sourceRecordId,
              source_start_line: row.sourceStartLine,
              source_hash_sha256: row.sourceHash,
              normalized_hash_sha256: row.normalizedHash,
              normalized_data: row.normalizedData,
              prepared_disposition: row.preparedDisposition,
              prepared_matched_festival_id: row.preparedMatchedFestivalId,
              prepared_digest_sha256: row.preparedDigest,
              disposition: row.disposition,
              duplicate_of_row_id: row.duplicateOfRowId,
              matched_festival_id: row.matchedFestivalId,
            })),
          });
          const issues = prepared.rows.flatMap((row) => row.issues.map((current) => ({
            batch_id: prepared.id,
            row_id: row.id,
            severity: current.severity,
            code: current.code,
            field: current.field,
            message: current.message,
            ...(current.safeDetails == null ? {} : { safe_details: current.safeDetails }),
          })));
          if (issues.length) await transaction.festivalImportIssue.createMany({ data: issues });
        });
        const batch = await loadBatch(prisma, { id: prepared.id });
        return { created: true, batch };
      } catch (error) {
        if (error?.code !== "P2002") throw error;
        const batch = await loadBatch(prisma, { source_checksum_sha256: prepared.sourceChecksum });
        if (!batch) throw error;
        return { created: false, batch };
      }
    },

    async recordReview(review) {
      const changed = await prisma.festivalImportBatch.updateMany({
        where: { id: review.batchId, status: "prepared", reviewer_user_id: null },
        data: {
          reviewer_user_id: review.reviewerUserId,
          reviewed_at: review.reviewedAt,
          reviewed_source_checksum_sha256: review.sourceChecksum,
          reviewed_category_map_checksum_sha256: review.categoryMapChecksum,
          reviewed_prepared_digest_sha256: review.preparedDigest,
          reviewed_environment: review.environment,
          review_evidence_sha256: review.reviewEvidence,
          review_approval_sha256: review.approvalDigest,
          review_public_key_sha256: review.publicKeyDigest,
          review_issued_at: review.issuedAt,
          review_expires_at: review.expiresAt,
          backup_provider: review.backupProvider,
          backup_artifact_id: review.backupArtifactId,
          backup_reference: review.backupReference,
          backup_checksum_sha256: review.backupChecksum,
          backup_version: review.backupVersion,
          restore_reference: review.restoreReference,
          restore_verified_at: review.restoreVerifiedAt,
        },
      });
      if (changed.count !== 1) throw Object.assign(new Error("Festival import review state changed"), { code: "review_conflict" });
      return loadBatch(prisma, { id: review.batchId });
    },

    async claimApplyAttempt({ batchId, priorStatus, attemptToken, claimedAt, expiresAt }) {
      const statusWhere = priorStatus === "running"
        ? { status: "running", apply_attempt_expires_at: { lte: claimedAt } }
        : { status: priorStatus };
      const changed = await prisma.festivalImportBatch.updateMany({
        where: { id: batchId, ...statusWhere },
        data: {
          status: "running",
          started_at: claimedAt,
          completed_at: null,
          failure_code: null,
          failure_message: null,
          apply_attempt_token: attemptToken,
          apply_attempt_started_at: claimedAt,
          apply_attempt_heartbeat_at: claimedAt,
          apply_attempt_expires_at: expiresAt,
        },
      });
      if (changed.count !== 1) throw Object.assign(new Error("Festival import apply attempt could not be claimed"), { code: "apply_attempt_conflict" });
      return prisma.festivalImportBatch.findUnique({ where: { id: batchId } });
    },

    importPreparedRow({ batchId, row, payload, operatorUserId, festivalId, occurrenceId, transitionId, revisionId, attemptToken, heartbeatAt, attemptExpiresAt }) {
      return prisma.$transaction(async (transaction) => {
        const fenced = await transaction.festivalImportBatch.updateMany({
          where: {
            id: batchId,
            status: "running",
            apply_attempt_token: attemptToken,
            apply_attempt_expires_at: { gt: heartbeatAt },
          },
          data: { apply_attempt_heartbeat_at: heartbeatAt, apply_attempt_expires_at: attemptExpiresAt },
        });
        if (fenced.count !== 1) throw Object.assign(new Error("Festival import apply attempt is stale"), { code: "stale_apply_attempt" });
        const current = await transaction.festivalImportRow.findUnique({
          where: { batch_id_row_number: { batch_id: batchId, row_number: row.row_number } },
          select: { disposition: true },
        });
        if (current?.disposition !== "ready") return { noOp: true };

        const ownPriorTarget = await transaction.festival.findUnique({
          where: { id: festivalId },
          select: { id: true, name: true, slug: true, workflow_state: true, revision: true },
        });
        if (ownPriorTarget) {
          const ownOccurrence = await transaction.festivalOccurrence.findUnique({ where: { id: occurrenceId }, select: { festival_id: true, source_key: true } });
          const ownTransition = await transaction.festivalTransition.findUnique({ where: { id: transitionId }, select: { festival_id: true } });
          const ownRevision = await transaction.festivalRevision.findUnique({ where: { id: revisionId }, select: { festival_id: true } });
          const isOwnDeterministicTarget = ownPriorTarget.name === payload.name
            && ownPriorTarget.slug === payload.slug
            && ownPriorTarget.workflow_state === "draft"
            && ownPriorTarget.revision === 0
            && ownOccurrence?.festival_id === festivalId
            && ownOccurrence.source_key === `festival-import:${batchId}:${row.row_number}`
            && ownTransition?.festival_id === festivalId
            && ownRevision?.festival_id === festivalId;
          if (!isOwnDeterministicTarget) {
            throw Object.assign(new Error("Deterministic target identity is occupied by incompatible data"), { code: "deterministic_target_conflict" });
          }
          await transaction.festivalImportRow.update({
            where: { batch_id_row_number: { batch_id: batchId, row_number: row.row_number } },
            data: { disposition: "imported", target_festival_id: festivalId },
          });
          return { festivalId, resumedPriorTarget: true };
        }

        const candidate = await transaction.festival.findFirst({
          where: {
            OR: [
              { slug: payload.slug },
              {
                name: { equals: payload.name, mode: "insensitive" },
                OR: [
                  { all_day_start: dateOnly(payload.all_day_start) },
                  { occurrences: { some: { is_primary: true, all_day_start: dateOnly(payload.all_day_start) } } },
                ],
              },
            ],
          },
          select: { id: true },
        });
        if (candidate) {
          await transaction.festivalImportRow.update({
            where: { batch_id_row_number: { batch_id: batchId, row_number: row.row_number } },
            data: {
              disposition: "quarantined",
              matched_festival_id: candidate.id,
              issues: { create: { severity: "error", code: "existing_target_candidate", message: "A target candidate appeared after preparation; no target was changed" } },
            },
          });
          return { quarantined: true };
        }

        const category = await transaction.category.findUnique({ where: { slug: payload.category_slug }, select: { id: true } });
        if (!category) throw Object.assign(new Error(`Prepared category ${payload.category_slug} does not exist`), { code: "category_not_found" });
        const allDayStart = dateOnly(payload.all_day_start);
        const allDayEnd = dateOnly(payload.all_day_end);
        const festival = await transaction.festival.create({
          data: {
            id: festivalId,
            name: payload.name,
            slug: payload.slug,
            location: payload.location,
            website_url: payload.website_url,
            contact_name: payload.contact_name,
            contact_email: payload.contact_email,
            contact_phone: payload.contact_phone,
            status: "draft",
            workflow_state: "draft",
            revision: 0,
            owner_user_id: null,
            calendar_date_type: "all_day",
            time_zone: payload.time_zone,
            all_day_start: allDayStart,
            all_day_end: allDayEnd,
          },
          select: FESTIVAL_REVISION_SNAPSHOT_SELECT,
        });
        await transaction.festivalCategory.create({
          data: { festival_id: festivalId, category_id: category.id },
        });
        await transaction.festivalOccurrence.create({
          data: {
            id: occurrenceId,
            festival_id: festivalId,
            source_key: `festival-import:${batchId}:${row.row_number}`,
            is_primary: true,
            calendar_date_type: "all_day",
            time_zone: payload.time_zone,
            all_day_start: allDayStart,
            all_day_end: allDayEnd,
            calendar_status: "confirmed",
            calendar_sequence: 0,
          },
        });
        await transaction.festivalTransition.create({
          data: {
            id: transitionId,
            festival_id: festivalId,
            actor_user_id: operatorUserId,
            from_state: null,
            to_state: "draft",
            revision: 0,
            reason: "Imported from a prepared CSV batch; remains private pending editorial review.",
          },
        });
        await transaction.festivalRevision.create({
          data: {
            id: revisionId,
            festival_id: festivalId,
            workflow_revision: 0,
            transition_id: transitionId,
            actor_user_id: operatorUserId,
            snapshot: buildFestivalRevisionSnapshot(festival),
          },
        });
        await transaction.festivalImportRow.update({
          where: { batch_id_row_number: { batch_id: batchId, row_number: row.row_number } },
          data: { disposition: "imported", target_festival_id: festivalId },
        });
        return { festivalId };
      });
    },

    async reconcile(batchId) {
      const batch = await prisma.festivalImportBatch.findUnique({ where: { id: batchId }, select: { total_row_count: true, operator_user_id: true } });
      const rows = await prisma.festivalImportRow.findMany({
        where: { batch_id: batchId },
        select: { id: true, disposition: true, target_festival_id: true },
      });
      const issueGroups = await prisma.festivalImportIssue.groupBy({ by: ["severity"], where: { batch_id: batchId }, _count: { _all: true } });
      const dispositions = { ready: 0, imported: 0, duplicate: 0, quarantined: 0, failed: 0 };
      rows.forEach((row) => { dispositions[row.disposition] += 1; });
      const imported = rows.filter(({ disposition }) => disposition === "imported");
      const festivalIds = imported.map(({ target_festival_id }) => target_festival_id);
      const festivals = festivalIds.length ? await prisma.festival.findMany({
        where: { id: { in: festivalIds } },
        select: { id: true, status: true, workflow_state: true, revision: true, published_at: true, owner_user_id: true },
      }) : [];
      const transitions = festivalIds.length ? await prisma.festivalTransition.findMany({
        where: { festival_id: { in: festivalIds } },
        select: { festival_id: true, actor_user_id: true, revision: true, from_state: true, to_state: true },
      }) : [];
      const revisions = festivalIds.length ? await prisma.festivalRevision.findMany({
        where: { festival_id: { in: festivalIds } },
        select: { festival_id: true, actor_user_id: true, workflow_revision: true },
      }) : [];
      const occurrences = festivalIds.length ? await prisma.festivalOccurrence.findMany({
        where: { festival_id: { in: festivalIds }, is_primary: true },
        select: { festival_id: true, calendar_date_type: true, all_day_start: true, all_day_end: true },
      }) : [];
      const categories = festivalIds.length ? await prisma.festivalCategory.findMany({
        where: { festival_id: { in: festivalIds } },
        select: { festival_id: true, category_id: true },
      }) : [];
      const byFestival = (records) => records.reduce((grouped, record) => {
        const group = grouped.get(record.festival_id) ?? [];
        group.push(record);
        grouped.set(record.festival_id, group);
        return grouped;
      }, new Map());
      const festivalById = new Map(festivals.map((festival) => [festival.id, festival]));
      const transitionsByFestival = byFestival(transitions);
      const revisionsByFestival = byFestival(revisions);
      const occurrencesByFestival = byFestival(occurrences);
      const categoriesByFestival = byFestival(categories);
      const sideEffects = festivalIds.length ? [
        await prisma.schedule.count({ where: { festival_id: { in: festivalIds } } }),
        await prisma.producerSubmissionNotification.count({ where: { festival_id: { in: festivalIds } } }),
        await prisma.festivalWorkflowNotification.count({ where: { festival_id: { in: festivalIds } } }),
        await prisma.organizerIntegration.count({ where: { festival_id: { in: festivalIds } } }),
        await prisma.organizerMailingConsentFestival.count({ where: { festival_id: { in: festivalIds } } }),
        await prisma.festivalAsset.count({ where: { festival_id: { in: festivalIds } } }),
        await prisma.festivalFile.count({ where: { festival_id: { in: festivalIds } } }),
        await prisma.festivalSocialFeed.count({ where: { festival_id: { in: festivalIds } } }),
      ] : Array(8).fill(0);
      const auditOk = imported.every(({ target_festival_id: festivalId }) => {
        const festival = festivalById.get(festivalId);
        const workflowTransitions = transitionsByFestival.get(festivalId) ?? [];
        const festivalRevisions = revisionsByFestival.get(festivalId) ?? [];
        const primaryOccurrences = occurrencesByFestival.get(festivalId) ?? [];
        const festivalCategories = categoriesByFestival.get(festivalId) ?? [];
        return festival
        && festival.status === "draft"
        && festival.workflow_state === "draft"
        && festival.revision === 0
        && festival.published_at === null
        && festival.owner_user_id === null
        && workflowTransitions.length === 1
        && workflowTransitions[0].revision === 0
        && workflowTransitions[0].from_state === null
        && workflowTransitions[0].to_state === "draft"
        && workflowTransitions[0].actor_user_id === batch?.operator_user_id
        && festivalRevisions.length === 1
        && festivalRevisions[0].workflow_revision === 0
        && festivalRevisions[0].actor_user_id === batch?.operator_user_id
        && primaryOccurrences.length === 1
        && primaryOccurrences[0].calendar_date_type === "all_day"
        && primaryOccurrences[0].all_day_start
        && primaryOccurrences[0].all_day_end
        && festivalCategories.length === 1;
      });
      const warningIssues = issueGroups.find(({ severity }) => severity === "warning")?._count._all ?? 0;
      const errorIssues = issueGroups.find(({ severity }) => severity === "error")?._count._all ?? 0;
      const counts = { total: rows.length, ...dispositions, warningIssues, errorIssues };
      return {
        ok: Boolean(batch) && rows.length === batch.total_row_count && dispositions.ready === 0 && auditOk && sideEffects.every((count) => count === 0),
        counts,
        checks: { sourceRowsRecorded: rows.length === batch?.total_row_count, importedAuditComplete: auditOk, importedPrivate: auditOk, noSideEffects: sideEffects.every((count) => count === 0) },
        sideEffectCount: sideEffects.reduce((sum, count) => sum + count, 0),
      };
    },

    async markCompleted(id, counts, attemptToken, completedAt) {
      const changed = await prisma.festivalImportBatch.updateMany({
        where: { id, status: "running", apply_attempt_token: attemptToken, apply_attempt_expires_at: { gt: completedAt } },
        data: {
          ...countData(counts),
          status: "completed",
          completed_at: completedAt,
          apply_attempt_token: null,
          apply_attempt_started_at: null,
          apply_attempt_heartbeat_at: null,
          apply_attempt_expires_at: null,
        },
      });
      if (changed.count !== 1) throw Object.assign(new Error("Festival import apply attempt is stale"), { code: "stale_apply_attempt" });
      return loadBatch(prisma, { id });
    },

    async markFailed(id, failure, counts = null, attemptToken, completedAt) {
      const failureCode = Object.hasOwn(PERSISTED_FAILURE_MESSAGES, failure?.code) ? failure.code : "apply_failed";
      const changed = await prisma.festivalImportBatch.updateMany({
        where: { id, status: "running", apply_attempt_token: attemptToken, apply_attempt_expires_at: { gt: completedAt } },
        data: {
          ...(counts ? countData(counts) : {}),
          status: "failed",
          completed_at: completedAt,
          failure_code: failureCode,
          failure_message: PERSISTED_FAILURE_MESSAGES[failureCode],
          apply_attempt_token: null,
          apply_attempt_started_at: null,
          apply_attempt_heartbeat_at: null,
          apply_attempt_expires_at: null,
        },
      });
      if (changed.count !== 1) throw Object.assign(new Error("Festival import apply attempt is stale"), { code: "stale_apply_attempt" });
      return prisma.festivalImportBatch.findUnique({ where: { id } });
    },
  });
}
