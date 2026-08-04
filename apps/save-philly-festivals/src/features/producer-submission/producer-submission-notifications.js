import { randomUUID } from "node:crypto";

const TEAM_ALIAS = "PRODUCER_SUBMISSION_TEAM_ALIAS";
const ATTEMPT_LEASE_MS = 5 * 60 * 1000;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function validEmail(value) {
  return typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function buildSubmissionNotification(notification, festival, { teamRecipientAddress } = {}) {
  const festivalName = festival.name || "Festival submission";
  if (notification.notification_type === "producer_receipt") {
    return {
      to: notification.recipient_email,
      subject: `Submission received: ${festivalName}`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px"><h1>Submission received</h1><p>We received <strong>${escapeHtml(festivalName)}</strong> and it is pending review.</p><p>We will contact you at this address if the review team needs more information.</p></div>`,
      text: `Submission received\n\nWe received ${festivalName} and it is pending review.`,
    };
  }
  if (notification.recipient_alias !== TEAM_ALIAS || !validEmail(teamRecipientAddress)) return null;
  return {
    to: teamRecipientAddress,
    subject: `Festival awaiting review: ${festivalName}`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px"><h1>Festival awaiting review</h1><p><strong>${escapeHtml(festivalName)}</strong> was submitted and is in the pending review queue.</p></div>`,
    text: `Festival awaiting review\n\n${festivalName} was submitted and is in the pending review queue.`,
  };
}

export async function deliverSubmissionNotifications(result, {
  repository,
  notificationProvider,
  teamRecipientAddress = process.env.PRODUCER_SUBMISSION_TEAM_ALIAS,
  now = () => new Date(),
  createAttemptToken = randomUUID,
} = {}) {
  const delivery = [];
  for (const notificationType of ["producer_receipt", "team_notification"]) {
    const attemptedAt = now();
    const attemptToken = createAttemptToken();
    const notification = await repository.claimSubmissionNotification({
      festivalId: result.festival.id,
      workflowRevision: result.festival.revision,
      notificationType,
      attemptToken,
      attemptedAt,
      staleBefore: new Date(attemptedAt.getTime() - ATTEMPT_LEASE_MS),
    });
    if (!notification) {
      delivery.push({ notificationType, attempted: false });
      continue;
    }

    const message = buildSubmissionNotification(notification, result.festival, { teamRecipientAddress });
    let providerResult;
    if (!message || typeof notificationProvider?.send !== "function") {
      providerResult = { success: false, code: "provider_unconfigured" };
    } else {
      try {
        providerResult = await notificationProvider.send(message, {
          idempotencyKey: `producer-submission/${notification.id}`,
        });
      } catch {
        providerResult = { success: false, code: "provider_error" };
      }
    }

    if (providerResult?.success) {
      await repository.markSubmissionNotificationSent({
        notificationId: notification.id,
        attemptToken,
        providerMessageId: providerResult.id || null,
        sentAt: now(),
      });
    } else {
      await repository.markSubmissionNotificationFailed({
        notificationId: notification.id,
        attemptToken,
        failureCode: providerResult?.code === "provider_unconfigured" ? "provider_unconfigured" : "provider_error",
      });
    }
    delivery.push({ notificationType, attempted: true, sent: Boolean(providerResult?.success) });
  }
  return delivery;
}

export const PRODUCER_SUBMISSION_TEAM_ALIAS = TEAM_ALIAS;
