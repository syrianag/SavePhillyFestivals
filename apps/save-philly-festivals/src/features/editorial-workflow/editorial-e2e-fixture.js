import { randomUUID } from "node:crypto";

import { EDITORIAL_E2E_USER, producerE2EFixtureEnabled, producerE2ESelectedIdentity, producerE2EState } from "@/features/producer-submission/producer-e2e-fixture";
import { EditorialConflictError, EditorialNotFoundError, isAssetReviewPermitted } from "./editorial-repository";

function clone(value) { return structuredClone(value); }
function detail(festival) {
  if (!festival) return null;
  const fixture = producerE2EState();
  return {
    ...clone(festival),
    private_assets: fixture.assets.filter((asset) => asset.festival_id === festival.id).map(clone),
    workflow_notifications: [...fixture.workflowNotifications.values()].filter((item) => item.festival_id === festival.id).map(clone),
    revisions: fixture.revisions.filter((item) => item.festival_id === festival.id).map(clone),
    occurrences: [],
  };
}

const repository = {
  async findCurrentUser(id) { return id === EDITORIAL_E2E_USER.id ? { ...EDITORIAL_E2E_USER } : null; },
  async list({ state, page, limit }) {
    const festivals = [...producerE2EState().festivals.values()].filter((item) => !state || item.workflow_state === state).map(clone);
    return { festivals: festivals.slice((page - 1) * limit, page * limit), pagination: { page, limit, total: festivals.length, pages: Math.ceil(festivals.length / limit) } };
  },
  async findDetail(id) { return detail(producerE2EState().festivals.get(id)); },
  async findForTransition(id) { return clone(producerE2EState().festivals.get(id)); },
  async setFeatured(id, featured) {
    const festival = producerE2EState().festivals.get(id);
    if (!festival) throw new EditorialNotFoundError();
    festival.featured = featured;
    return clone(festival);
  },
  async transition({ festivalId, expectedRevision, fromState, toState, reason, producerMessage, publicMessage, actorUserId, now }) {
    const festival = producerE2EState().festivals.get(festivalId);
    if (!festival) throw new EditorialNotFoundError();
    if (festival.revision !== expectedRevision || festival.workflow_state !== fromState) throw new EditorialConflictError();
    festival.workflow_state = toState;
    festival.status = toState === "pending_review" ? "pending" : toState;
    festival.revision += 1;
    festival.updated_at = now;
    festival.public_message = toState === "canceled" ? publicMessage : null;
    festival.first_published_at ||= toState === "published" ? now : null;
    festival.published_at = toState === "published" ? now : null;
    festival.canceled_at = toState === "canceled" ? now : null;
    festival.calendar_published_at ||= toState === "published" ? now : null;
    festival.calendar_status = toState === "canceled" ? "canceled" : "confirmed";
    festival.workflow_transitions ||= [];
    festival.workflow_transitions.push({ id: randomUUID(), actor_user_id: actorUserId, from_state: fromState, to_state: toState, revision: festival.revision, reason: reason || null, producer_message: producerMessage || null, public_message: publicMessage || null, created_at: now });
    producerE2EState().revisions.push({ id: randomUUID(), festival_id: festivalId, workflow_revision: festival.revision, actor_user_id: actorUserId, created_at: now });
    const notification = { id: randomUUID(), festival_id: festivalId, workflow_revision: festival.revision, audience: "producer", recipient_email: festival.contact_email, delivery_status: "pending", attempts: 0, failure_code: null, attempt_token: null, created_at: now };
    producerE2EState().workflowNotifications.set(`${festivalId}:${festival.revision}`, notification);
    return clone(festival);
  },
  async claimNotification({ notificationId, festivalId, workflowRevision, attemptToken, attemptedAt, staleBefore, maxAttempts }) {
    const item = producerE2EState().workflowNotifications.get(`${festivalId}:${workflowRevision}`);
    if (!item || (notificationId && item.id !== notificationId) || item.delivery_status === "sent" || item.attempts >= maxAttempts) return null;
    if (item.attempt_token && (!item.attempt_started_at || item.attempt_started_at >= staleBefore)) return null;
    Object.assign(item, { delivery_status: "pending", failure_code: null, attempt_token: attemptToken, attempt_started_at: attemptedAt, attempted_at: attemptedAt, attempts: item.attempts + 1 });
    return clone(item);
  },
  async findNotificationStatus(id) {
    const item = [...producerE2EState().workflowNotifications.values()].find((value) => value.id === id);
    return item ? clone(item) : null;
  },
  async findNotificationForRetry({ festivalId, notificationId }) {
    const item = [...producerE2EState().workflowNotifications.values()].find((value) => value.id === notificationId && value.festival_id === festivalId);
    const festival = producerE2EState().festivals.get(festivalId);
    const transition = festival?.workflow_transitions?.find((value) => value.revision === item?.workflow_revision);
    return item && festival && transition ? { festival: { ...clone(festival), revision: item.workflow_revision }, transition: clone(transition) } : null;
  },
  async markNotificationSent({ id, attemptToken, providerMessageId, sentAt }) {
    const item = [...producerE2EState().workflowNotifications.values()].find((value) => value.id === id && value.attempt_token === attemptToken);
    if (item) Object.assign(item, { delivery_status: "sent", provider_message_id: providerMessageId, failure_code: null, sent_at: sentAt, attempt_token: null, attempt_started_at: null });
        return { count: item ? 1 : 0 };
  },
  async markNotificationFailed({ id, attemptToken, failureCode }) {
    const item = [...producerE2EState().workflowNotifications.values()].find((value) => value.id === id && value.attempt_token === attemptToken);
    if (item) Object.assign(item, { delivery_status: "failed", failure_code: failureCode, attempt_token: null, attempt_started_at: null });
        return { count: item ? 1 : 0 };
  },
  async reviewAsset({ festivalId, assetId, expectedFestivalRevision, decision, reason, actorUserId, now }) {
    const festival = producerE2EState().festivals.get(festivalId);
    if (!festival) throw new EditorialNotFoundError();
    if (!isAssetReviewPermitted(festival, expectedFestivalRevision)) throw new EditorialConflictError();
    const asset = producerE2EState().assets.find((item) => item.id === assetId && item.festival_id === festivalId && (item.editorial_status || "pending") === "pending");
    if (!asset) throw new EditorialConflictError();
    Object.assign(asset, { editorial_status: decision, editorial_reason: reason || null, reviewed_by_user_id: actorUserId, reviewed_at: now });
    return clone(asset);
  },
};

const notificationProvider = {
  async send(message) {
    if (message?.subject?.includes("notification failure fixture")) throw new Error("fixture failure");
    return { success: true, id: `fixture-editorial-${randomUUID()}` };
  },
};

export async function editorialE2EDependencies() {
  if (!producerE2EFixtureEnabled() || await producerE2ESelectedIdentity() !== "admin") return null;
  return {
    getSession: async () => ({ user: { id: EDITORIAL_E2E_USER.id } }),
    userRepository: repository,
    repository,
    notificationProvider,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    nodeEnv: process.env.NODE_ENV,
    edgeRateLimitVerified: true,
  };
}

export function editorialE2ERepository() {
  return producerE2EFixtureEnabled() ? repository : null;
}

function asPublicFixture(festival) {
  return festival ? { ...clone(festival), schedules: [], categories: [], tags: [], occurrences: [] } : null;
}
export function editorialE2EPublicFestival({ id, slug } = {}) {
  if (!producerE2EFixtureEnabled()) return undefined;
  const festival = [...producerE2EState().festivals.values()].find((item) => (id ? item.id === id : item.slug === slug));
  return festival && (festival.workflow_state === "published" || (festival.workflow_state === "canceled" && festival.first_published_at)) ? asPublicFixture(festival) : null;
}
export function editorialE2EPublicCatalog() {
  if (!producerE2EFixtureEnabled()) return [];
  return [...producerE2EState().festivals.values()].filter((item) => item.workflow_state === "published").map(asPublicFixture);
}
