import { randomUUID } from "node:crypto";

export const WORKFLOW_NOTIFICATION_LEASE_MS = 5 * 60 * 1000;
export const WORKFLOW_NOTIFICATION_MAX_ATTEMPTS = 5;

/**
 * Stamped on outbox rows created by a bulk publish, which must never be delivered.
 *
 * A bulk run transitions hundreds of imported festivals whose `contact_email` is the organizer's
 * real address from the source spreadsheet. The rows are still written so the audit trail stays
 * complete, but the admin retry button would otherwise turn one click into hundreds of
 * unsolicited emails months later. `retryWorkflowNotification` refuses this code outright, and
 * the rows also carry `attempts` at the cap so `claimNotification` cannot lease them.
 */
export const WORKFLOW_NOTIFICATION_SUPPRESSED_CODE = "bulk_publish_suppressed";

export function escapeEditorialHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

export function buildWorkflowNotification({ festival, transition, recipientEmail }) {
  if (!recipientEmail) return null;
  const title = `Festival update: ${transition.toState.replaceAll("_", " ")}`;
  const safeName = escapeEditorialHtml(festival.name || "Your festival");
  const safeMessage = transition.producerMessage ? `<p>${escapeEditorialHtml(transition.producerMessage)}</p>` : "";
  return {
    to: recipientEmail,
    subject: `${title} — ${festival.name || "festival submission"}`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px"><h1>${escapeEditorialHtml(title)}</h1><p><strong>${safeName}</strong> is now ${escapeEditorialHtml(transition.toState.replaceAll("_", " "))}.</p>${safeMessage}</div>`,
    text: `${title}\n\n${festival.name || "Your festival"} is now ${transition.toState.replaceAll("_", " ")}.${transition.producerMessage ? `\n\n${transition.producerMessage}` : ""}`,
  };
}

function safeDelivery({ attempted = false, sent = false, deliveryStatus = "pending", retryNeeded = false } = {}) {
  return { attempted, sent, delivery_status: deliveryStatus, retry_needed: retryNeeded };
}

export async function deliverWorkflowNotification(result, {
  repository,
  provider,
  now = () => new Date(),
  createAttemptToken = randomUUID,
  notificationId,
} = {}) {
  const attemptedAt = now();
  const attemptToken = createAttemptToken();
  let notification;
  try {
    notification = await repository.claimNotification({
      ...(notificationId ? { notificationId } : {}),
      festivalId: result.festival.id,
      workflowRevision: result.festival.revision,
      attemptToken,
      attemptedAt,
      staleBefore: new Date(attemptedAt.getTime() - WORKFLOW_NOTIFICATION_LEASE_MS),
      maxAttempts: WORKFLOW_NOTIFICATION_MAX_ATTEMPTS,
    });
  } catch {
    return safeDelivery({ retryNeeded: true });
  }
  if (!notification) {
    let current = null;
    try { current = await repository.findNotificationStatus?.(notificationId); } catch { /* safe unknown status */ }
    return safeDelivery({
      sent: current?.delivery_status === "sent",
      deliveryStatus: current?.delivery_status || "pending",
      retryNeeded: current ? current.delivery_status !== "sent" && current.attempts < WORKFLOW_NOTIFICATION_MAX_ATTEMPTS : true,
    });
  }

  const message = buildWorkflowNotification({ ...result, recipientEmail: notification.recipient_email });
  let providerResult;
  if (!message) providerResult = { success: false, code: "recipient_unavailable" };
  else if (typeof provider?.send !== "function") providerResult = { success: false, code: "provider_unconfigured" };
  else {
    try {
      providerResult = await provider.send(message, { idempotencyKey: `festival-workflow/${notification.id}` });
    } catch {
      providerResult = { success: false, code: "provider_error" };
    }
  }

  if (providerResult?.success) {
    try {
      const marked = await repository.markNotificationSent({ id: notification.id, attemptToken, providerMessageId: providerResult.id || null, sentAt: now() });
      if (marked?.count === 0) return safeDelivery({ attempted: true, retryNeeded: true });
      return safeDelivery({ attempted: true, sent: true, deliveryStatus: "sent" });
    } catch {
      // The stable provider key makes recovery safe after a provider success/bookkeeping crash.
      return safeDelivery({ attempted: true, retryNeeded: true });
    }
  }

  const safeCode = ["recipient_unavailable", "provider_unconfigured"].includes(providerResult?.code) ? providerResult.code : "provider_error";
  try {
    const marked = await repository.markNotificationFailed({ id: notification.id, attemptToken, failureCode: safeCode });
    if (marked?.count === 0) return safeDelivery({ attempted: true, retryNeeded: true });
    return safeDelivery({ attempted: true, deliveryStatus: "failed", retryNeeded: notification.attempts < WORKFLOW_NOTIFICATION_MAX_ATTEMPTS });
  } catch {
    return safeDelivery({ attempted: true, retryNeeded: true });
  }
}
