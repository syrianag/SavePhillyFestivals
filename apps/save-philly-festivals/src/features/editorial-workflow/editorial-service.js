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

export async function setFestivalFeatured(festivalId, featured, { repository }) {
  const current = await repository.findForTransition(festivalId);
  if (!current) throw new EditorialNotFoundError();
  return repository.setFeatured(festivalId, featured);
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
