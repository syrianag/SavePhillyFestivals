import { randomUUID } from "node:crypto";

import { completeFestivalSchema } from "./producer-submission-schema";
import {
  ProducerFestivalIncompleteError,
  ProducerFestivalNotFoundError,
} from "./producer-submission-errors";
import { deliverSubmissionNotifications, PRODUCER_SUBMISSION_TEAM_ALIAS } from "./producer-submission-notifications";

function isUniqueConstraintError(error) {
  return error?.code === "P2002";
}

function toPersistencePatch(input) {
  const { expected_revision: _, ...data } = input;
  if (Object.hasOwn(data, "start_date") && data.start_date !== null) data.start_date = new Date(data.start_date);
  if (Object.hasOwn(data, "end_date") && data.end_date !== null) data.end_date = new Date(data.end_date);
  if (Object.hasOwn(data, "all_day_start") && data.all_day_start !== null) data.all_day_start = new Date(`${data.all_day_start}T00:00:00.000Z`);
  if (Object.hasOwn(data, "all_day_end") && data.all_day_end !== null) data.all_day_end = new Date(`${data.all_day_end}T00:00:00.000Z`);
  if (data.calendar_date_type === "timed") {
    data.all_day_start = null;
    data.all_day_end = null;
  } else if (data.calendar_date_type === "all_day") {
    data.start_date = null;
    data.end_date = null;
  }
  return data;
}

function assertCompleteFestival(festival) {
  const parsed = completeFestivalSchema.safeParse(festival);
  if (!parsed.success) {
    throw new ProducerFestivalIncompleteError(parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })));
  }
}



export async function createOwnedDraft(input, { repository, user, createId = randomUUID }) {
  const existing = await repository.findOwnedBySubmissionKey(user.id, input.submission_key);
  if (existing) return { festival: existing, replayed: true };

  const id = createId();
  try {
    const festival = await repository.createOwnedDraft({
      id,
      ownerUserId: user.id,
      submissionKey: input.submission_key,
      slug: `producer-draft-${id}`,
    });
    return { festival, replayed: false };
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const replay = await repository.findOwnedBySubmissionKey(user.id, input.submission_key);
    if (!replay) throw error;
    return { festival: replay, replayed: true };
  }
}

export async function listOwnedFestivals({ repository, user }) {
  return repository.listOwned(user.id);
}

export async function getOwnedFestival(festivalId, { repository, user }) {
  const festival = await repository.findOwned(user.id, festivalId);
  if (!festival) throw new ProducerFestivalNotFoundError();
  return festival;
}

export function patchOwnedFestival(festivalId, input, { repository, user }) {
  return repository.updateOwnedEditable({
    ownerUserId: user.id,
    festivalId,
    expectedRevision: input.expected_revision,
    data: toPersistencePatch(input),
  });
}

export async function submitOwnedFestival(festivalId, input, {
  repository,
  user,
  notificationProvider,
  teamRecipientAddress = process.env.PRODUCER_SUBMISSION_TEAM_ALIAS,
  now = () => new Date(),
  createAttemptToken,
}) {
  const result = await repository.submitOwned({
    ownerUserId: user.id,
    festivalId,
    expectedRevision: input.expected_revision,
    teamRecipientAlias: PRODUCER_SUBMISSION_TEAM_ALIAS,
    acknowledgments: { at: now(), termsVersion: input.terms_version },
    assertComplete: assertCompleteFestival,
  });

  // Delivery is deliberately after the atomic workflow/outbox transaction. Provider
  // failure is recorded durably and never rolls the festival out of pending review.
  result.notificationDelivery = await deliverSubmissionNotifications(result, {
    repository,
    notificationProvider,
    teamRecipientAddress,
    now,
    ...(createAttemptToken ? { createAttemptToken } : {}),
  });
  return result;
}
