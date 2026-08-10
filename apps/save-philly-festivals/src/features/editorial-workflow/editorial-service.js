import { allDayTimedMirror } from "@/features/festivals/discovery";
import { assertEditorialTransition, validTransitions } from "./editorial-transition-policy";
import { EditorialConflictError, EditorialNotFoundError } from "./editorial-repository";
import { deliverWorkflowNotification } from "./editorial-notifications";

export async function listEditorialFestivals(input, { repository }) {
  return repository.list(input);
}

export async function getEditorialFestival(id, { repository }) {
  const festival = await repository.findDetail(id);
  if (!festival) throw new EditorialNotFoundError();
  return { ...festival, valid_actions: validTransitions(festival.workflow_state) };
}

/**
 * Editor content edit, distinct from a workflow transition.
 *
 * Dates arrive as strings from the wire and are converted here; all-day festivals also get
 * their timed mirror written, because public discovery sorts and filters on `start_date` and a
 * null there makes the festival render as "Dates TBD" and drop out of every date filter.
 */
export async function updateEditorialFestival(festivalId, input, dependencies) {
  const { repository, user } = dependencies;
  const current = await repository.findForTransition(festivalId);
  if (!current) throw new EditorialNotFoundError();
  if (current.revision !== input.expected_revision) throw new EditorialConflictError();

  const { expected_revision: _ignored, reason, ...data } = input;
  if (!Object.keys(data).length) throw new EditorialConflictError();

  /* Whether the caller actually supplied dates, captured before the all-day mirror is applied
   * below. The mirror writes start_date/end_date as derived values, so testing `data` after it
   * would resync the occurrence on every edit — including a pure name change. */
  const datesChanged = ["calendar_date_type", "start_date", "end_date", "all_day_start", "all_day_end"]
    .some((key) => Object.hasOwn(data, key));
  for (const key of ["start_date", "end_date"]) {
    if (Object.hasOwn(data, key) && data[key] !== null) data[key] = new Date(data[key]);
  }
  for (const key of ["all_day_start", "all_day_end"]) {
    if (Object.hasOwn(data, key) && data[key] !== null) data[key] = new Date(`${data[key]}T00:00:00.000Z`);
  }

  const dateType = data.calendar_date_type ?? current.calendar_date_type;
  if (dateType === "timed") {
    if (Object.hasOwn(data, "calendar_date_type")) {
      data.all_day_start = null;
      data.all_day_end = null;
    }
  } else {
    const allDayStart = Object.hasOwn(data, "all_day_start") ? data.all_day_start : current.all_day_start;
    const allDayEnd = Object.hasOwn(data, "all_day_end") ? data.all_day_end : current.all_day_end;
    Object.assign(data, allDayTimedMirror(allDayStart, allDayEnd));
  }

  return {
    festival: await repository.updateEditable({
      festivalId,
      expectedRevision: input.expected_revision,
      data,
      reason,
      datesChanged,
      actorUserId: user.id,
      ...(dependencies.createId ? { createId: dependencies.createId } : {}),
    }),
  };
}

export async function transitionFestival(festivalId, input, dependencies) {
  const { repository, user, now = () => new Date() } = dependencies;
  const current = await repository.findForTransition(festivalId);
  if (!current) throw new EditorialNotFoundError();
  if (current.revision !== input.expected_revision) throw new EditorialConflictError();
  assertEditorialTransition({
    role: user.role,
    fromState: current.workflow_state,
    toState: input.to_state,
    reason: input.reason,
    producerMessage: input.producer_message,
    publicMessage: input.public_message,
  });
  const festival = await repository.transition({
    festivalId,
    expectedRevision: input.expected_revision,
    fromState: current.workflow_state,
    toState: input.to_state,
    reason: input.reason,
    producerMessage: input.producer_message,
    publicMessage: input.public_message,
    actorUserId: user.id,
    now: now(),
    ...(dependencies.createId ? { createId: dependencies.createId } : {}),
  });
  const result = {
    festival,
    transition: { fromState: current.workflow_state, toState: input.to_state, producerMessage: input.producer_message || null },
  };
  // Deliberately outside the state/snapshot/audit/outbox transaction. Delivery is
  // recovery-safe and never turns a committed transition into an HTTP failure.
  result.notification = await deliverWorkflowNotification(result, {
    repository,
    provider: dependencies.notificationProvider,
    now,
    ...(dependencies.createAttemptToken ? { createAttemptToken: dependencies.createAttemptToken } : {}),
  });
  return result;
}

export async function retryWorkflowNotification(festivalId, notificationId, dependencies) {
  const { repository, now = () => new Date() } = dependencies;
  const pending = await repository.findNotificationForRetry({ festivalId, notificationId });
  if (!pending) throw new EditorialNotFoundError("Workflow notification not found.");
  const notification = await deliverWorkflowNotification({
    festival: pending.festival,
    transition: { toState: pending.transition.to_state, producerMessage: pending.transition.producer_message },
    recipientEmail: pending.recipientEmail,
  }, {
    repository,
    provider: dependencies.notificationProvider,
    notificationId,
    now,
    ...(dependencies.createAttemptToken ? { createAttemptToken: dependencies.createAttemptToken } : {}),
  });
  return { notification };
}

export function reviewFestivalAsset(festivalId, input, { repository, user, now = () => new Date() }) {
  return repository.reviewAsset({
    festivalId,
    assetId: input.asset_id,
    expectedFestivalRevision: input.expected_festival_revision,
    decision: input.decision,
    reason: input.reason,
    actorUserId: user.id,
    now: now(),
  });
}
