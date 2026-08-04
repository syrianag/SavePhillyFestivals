import { createHmac, timingSafeEqual } from "node:crypto";

import { ProducerFestivalConflictError, ProducerFestivalNotFoundError } from "./producer-submission-errors";
import { PRODUCER_SUBMISSION_TEAM_ALIAS } from "./producer-submission-notifications";

export const PRODUCER_E2E_COOKIE = "producer-e2e-user";
export const PRODUCER_E2E_USER = Object.freeze({
  id: "10000000-0000-4000-8000-00000000000a",
  email: "producer-a@example.test",
  email_verified: new Date("2026-08-04T00:00:00.000Z"),
  role: "producer",
});

const STATE_KEY = Symbol.for("save-philly-festivals.producer-e2e-state");
const EDITABLE_STATES = new Set(["draft", "changes_requested"]);

export function producerE2EFixtureEnabled(
  value = process.env.PRODUCER_E2E_FIXTURE,
  nodeEnv = process.env.NODE_ENV,
  secret = process.env.PRODUCER_E2E_SECRET,
) {
  return value === "1" && nodeEnv !== "production" && typeof secret === "string" && secret.length >= 32;
}

function fixtureSecret() {
  if (!producerE2EFixtureEnabled()) return null;
  return process.env.PRODUCER_E2E_SECRET;
}

export function signProducerE2ECookie(value, secret = fixtureSecret()) {
  if (!secret) return null;
  const signature = createHmac("sha256", secret).update(value).digest("base64url");
  return `${value}.${signature}`;
}

export function verifyProducerE2ECookie(cookie, secret = fixtureSecret()) {
  if (!secret || typeof cookie !== "string") return null;
  const separator = cookie.lastIndexOf(".");
  if (separator < 1) return null;
  const value = cookie.slice(0, separator);
  const supplied = Buffer.from(cookie.slice(separator + 1));
  const expected = Buffer.from(createHmac("sha256", secret).update(value).digest("base64url"));
  return supplied.length === expected.length && timingSafeEqual(supplied, expected) ? value : null;
}

function emptyState() {
  return { sequence: 0, festivals: new Map(), submissionKeys: new Map(), assets: [], notifications: new Map() };
}

function state() {
  globalThis[STATE_KEY] ||= emptyState();
  return globalThis[STATE_KEY];
}

export function resetProducerE2EFixture() {
  globalThis[STATE_KEY] = emptyState();
}

function nextUuid() {
  const fixture = state();
  fixture.sequence += 1;
  return `20000000-0000-4000-8000-${String(fixture.sequence).padStart(12, "0")}`;
}

function cloneFestival(festival) {
  return festival ? { ...festival } : null;
}

function owned(ownerUserId, festivalId) {
  const festival = state().festivals.get(festivalId);
  return festival?.owner_user_id === ownerUserId ? festival : null;
}

function assertEditable(festival) {
  if (!EDITABLE_STATES.has(festival.workflow_state)) throw new ProducerFestivalConflictError();
}

const repository = {
  async findCurrentUser(id) {
    if (id === PRODUCER_E2E_USER.id) return { ...PRODUCER_E2E_USER };
    if (id === "10000000-0000-4000-8000-00000000000d") return { id, email: "unverified@example.test", email_verified: null, role: "producer" };
    return null;
  },
  async findOwnedBySubmissionKey(ownerUserId, submissionKey) {
    const id = state().submissionKeys.get(`${ownerUserId}:${submissionKey}`);
    return cloneFestival(id ? owned(ownerUserId, id) : null);
  },
  async listOwned(ownerUserId) {
    return [...state().festivals.values()].filter((festival) => festival.owner_user_id === ownerUserId)
      .sort((a, b) => b.updated_at - a.updated_at).map(cloneFestival);
  },
  async findOwned(ownerUserId, festivalId) { return cloneFestival(owned(ownerUserId, festivalId)); },
  async createOwnedDraft({ id, ownerUserId, submissionKey }) {
    const now = new Date();
    const festival = {
      id, owner_user_id: ownerUserId, name: "", description: null, location: null, city: null, state: null,
      zip_code: null, contact_name: null, contact_email: null, contact_phone: null, website_url: null,
      calendar_date_type: "timed", time_zone: "America/New_York", start_date: null, end_date: null,
      all_day_start: null, all_day_end: null, status: "draft", workflow_state: "draft", revision: 0,
      created_at: now, updated_at: now,
    };
    state().festivals.set(id, festival);
    state().submissionKeys.set(`${ownerUserId}:${submissionKey}`, id);
    return cloneFestival(festival);
  },
  async updateOwnedEditable({ ownerUserId, festivalId, expectedRevision, data }) {
    const festival = owned(ownerUserId, festivalId);
    if (!festival) throw new ProducerFestivalNotFoundError();
    assertEditable(festival);
    if (festival.revision !== expectedRevision) throw new ProducerFestivalConflictError();
    Object.assign(festival, data, { revision: festival.revision + 1, updated_at: new Date() });
    return cloneFestival(festival);
  },
  async submitOwned({ ownerUserId, festivalId, expectedRevision, assertComplete }) {
    const festival = owned(ownerUserId, festivalId);
    if (!festival) throw new ProducerFestivalNotFoundError();
    if (festival.workflow_state === "pending_review" && festival.revision === expectedRevision + 1) return { festival: cloneFestival(festival), replayed: true };
    assertEditable(festival);
    if (festival.revision !== expectedRevision) throw new ProducerFestivalConflictError();
    assertComplete(festival);
    festival.workflow_state = "pending_review";
    festival.status = "pending";
    festival.revision += 1;
    festival.updated_at = new Date();
    for (const type of ["producer_receipt", "team_notification"]) {
      const id = nextUuid();
      state().notifications.set(`${festival.id}:${festival.revision}:${type}`, {
        id, festival_id: festival.id, workflow_revision: festival.revision, notification_type: type,
        recipient_email: type === "producer_receipt" ? festival.contact_email : null,
        recipient_alias: type === "team_notification" ? PRODUCER_SUBMISSION_TEAM_ALIAS : null,
        delivery_status: "pending", attempts: 0, attempt_token: null,
      });
    }
    return { festival: cloneFestival(festival), replayed: false };
  },
  async claimSubmissionNotification({ festivalId, workflowRevision, notificationType, attemptToken }) {
    const notification = state().notifications.get(`${festivalId}:${workflowRevision}:${notificationType}`);
    if (!notification || notification.delivery_status === "sent" || notification.attempt_token) return null;
    Object.assign(notification, { delivery_status: "pending", attempt_token: attemptToken, attempts: notification.attempts + 1 });
    return { ...notification };
  },
  async markSubmissionNotificationSent({ notificationId, attemptToken, providerMessageId }) {
    const notification = [...state().notifications.values()].find((item) => item.id === notificationId && item.attempt_token === attemptToken);
    if (notification) Object.assign(notification, { delivery_status: "sent", provider_message_id: providerMessageId, attempt_token: null });
  },
  async markSubmissionNotificationFailed({ notificationId, attemptToken, failureCode }) {
    const notification = [...state().notifications.values()].find((item) => item.id === notificationId && item.attempt_token === attemptToken);
    if (notification) Object.assign(notification, { delivery_status: "failed", failure_code: failureCode, attempt_token: null });
  },
  async assertOwnedEditable(ownerUserId, festivalId) {
    const festival = owned(ownerUserId, festivalId);
    if (!festival) throw new ProducerFestivalNotFoundError();
    assertEditable(festival);
    return cloneFestival(festival);
  },
  async createPrivateAsset({ ownerUserId, festivalId, asset }) {
    const festival = owned(ownerUserId, festivalId);
    if (!festival) throw new ProducerFestivalNotFoundError();
    assertEditable(festival);
    const record = {
      id: asset.id, festival_id: festivalId, server_filename: asset.serverFilename, mime_type: asset.mimeType,
      byte_size: asset.byteSize, checksum_sha256: asset.checksumSha256, purpose: asset.purpose, alt_text: asset.altText,
      rights_version: asset.rightsVersion, scan_status: "pending", lifecycle_status: "active", created_at: new Date(),
    };
    state().assets.push(record);
    return { ...record };
  },
};

const fixtureScanner = {
  async scan({ bytes, mimeType }) {
    const signature = Buffer.from(bytes).subarray(0, 8).toString("hex");
    return { clean: mimeType === "image/png" && signature === "89504e470d0a1a0a" };
  },
};
const provider = {
  async isOperational() { return typeof fixtureScanner.scan === "function"; },
  async uploadPrivate(input) {
    const scan = await fixtureScanner.scan(input);
    if (!scan.clean) throw Object.assign(new Error("Fixture scanner rejected asset"), { code: "scanner_rejected" });
    return { driveFileId: `fixture-private-${nextUuid()}`, metadata: { md5Checksum: "fixture-only", version: "1" } };
  },
  async deletePrivate() {},
};
const notificationProvider = { async send() { return { success: true, id: `fixture-mail-${nextUuid()}` }; } };
const rateLimiter = { consume: () => true };

export async function producerE2EDependencies() {
  if (!producerE2EFixtureEnabled()) return null;
  const { cookies } = await import("next/headers");
  const selectedUser = verifyProducerE2ECookie((await cookies()).get(PRODUCER_E2E_COOKIE)?.value);
  const sessionUserId = selectedUser === "producer-a" ? PRODUCER_E2E_USER.id
    : selectedUser === "denied" ? "10000000-0000-4000-8000-00000000000d" : null;
  return {
    getSession: async () => sessionUserId ? { user: { id: sessionUserId } } : null,
    repository, userRepository: repository, provider, notificationProvider, rateLimiter,
    createId: nextUuid, createAttemptToken: nextUuid, teamRecipientAddress: "fixture-team@example.test",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    nodeEnv: process.env.NODE_ENV,
    edgeRateLimitVerified: true,
  };
}
