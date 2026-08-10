import { Resend } from "resend";

const resendClient = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@savephillyfestivals.com";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://savephillyfestivals.com";
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || "info@savephillyfestivals.org";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

export async function sendContactEmail({ name, email, message }) {
  const subject = `New contact message from ${name || "a visitor"}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
      <h2 style="margin: 0 0 8px;">New Contact Message</h2>
      <p style="color: #555; margin: 0 0 24px;">A visitor sent a message through the contact form.</p>

      <div style="background: #f7f7f7; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 4px;"><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p style="margin: 0;"><strong>Email:</strong> ${escapeHtml(email)}</p>
      </div>

      <div style="white-space: pre-wrap; color: #333;">${escapeHtml(message)}</div>

      <p style="color: #999; font-size: 12px; margin-top: 32px;">Save Philly Festivals</p>
    </div>
  `.trim();

  return sendEmail({ to: CONTACT_EMAIL, subject, html, replyTo: email });
}

export async function sendCommunicationEmail({ toEmail, fromEmail, subject, body }) {
  const to = toEmail || fromEmail;

  if (!to) {
    return { success: false, code: "no_recipient" };
  }

  const replyTo = fromEmail && fromEmail !== FROM_EMAIL ? fromEmail : undefined;
  const cc = fromEmail && to !== fromEmail ? fromEmail : undefined;
  const safeSubject = subject?.trim() || "Message from Save Philly Festivals";

  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
      <h2 style="margin: 0 0 8px;">${escapeHtml(safeSubject)}</h2>
      ${fromEmail ? `<p style="color: #555; margin: 0 0 24px;">From: ${escapeHtml(fromEmail)}</p>` : ""}

      <div style="background: #f7f7f7; border-radius: 8px; padding: 20px; margin-bottom: 24px; white-space: pre-wrap;">
        ${escapeHtml(body || "")}
      </div>

      <p style="color: #999; font-size: 12px; margin-top: 32px;">Save Philly Festivals</p>
    </div>
  `.trim();

  return sendEmail({ to, subject: safeSubject, html, replyTo, cc });
}

export async function sendScheduleConfirmation({ to, festivalName, scheduleTitle, startTime, endTime }) {
  const startStr = startTime ? new Date(startTime).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" }) : "";
  const endStr = endTime ? new Date(endTime).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" }) : "";

  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
      <h2 style="margin: 0 0 8px;">Schedule Saved</h2>
      <p style="color: #555; margin: 0 0 24px;">Your schedule has been saved.</p>

      <div style="background: #f7f7f7; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 4px;"><strong>Festival:</strong> ${festivalName}</p>
        <p style="margin: 0 0 4px;"><strong>Event:</strong> ${scheduleTitle}</p>
        ${startStr ? `<p style="margin: 0 0 4px;"><strong>Start:</strong> ${startStr}</p>` : ""}
        ${endStr ? `<p style="margin: 0;"><strong>End:</strong> ${endStr}</p>` : ""}
      </div>

      <a href="${SITE_URL}/my-schedule"
         style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
        View My Schedule
      </a>

      <p style="color: #999; font-size: 12px; margin-top: 32px;">Save Philly Festivals</p>
    </div>
  `.trim();

  return sendEmail({ to, subject: `Schedule saved: ${scheduleTitle} at ${festivalName}`, html });
}

export async function sendMailingListForward({ to, visitorEmail, festivalName }) {
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
      <h2 style="margin: 0 0 8px;">New Subscriber</h2>
      <p style="color: #555; margin: 0 0 24px;">
        A visitor opted in to receive updates for <strong>${festivalName}</strong>.
      </p>

      <div style="background: #f7f7f7; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 4px;"><strong>Visitor email:</strong> ${visitorEmail}</p>
        <p style="margin: 0;">You can now send them updates about your festival.</p>
      </div>

      <p style="color: #999; font-size: 12px; margin-top: 32px;">Save Philly Festivals</p>
    </div>
  `.trim();

  return sendEmail({ to, subject: `New subscriber: ${festivalName} mailing list`, html });
}

export async function sendSubmissionConfirmation({ to, festivalName }) {
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
      <h2 style="margin: 0 0 8px;">Festival Submitted</h2>
      <p style="color: #555; margin: 0 0 24px;">
        Your festival <strong>${festivalName}</strong> has been submitted for review.
      </p>
      <p style="color: #555;">We'll notify you once it's been approved or if we need more information.</p>

      <p style="color: #999; font-size: 12px; margin-top: 32px;">Save Philly Festivals</p>
    </div>
  `.trim();

  return sendEmail({ to, subject: `Festival submitted: ${festivalName}`, html });
}

export async function sendFestivalApproved({ to, festivalName, reason }) {
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
      <h2 style="margin: 0 0 8px;">Festival Approved</h2>
      <p style="color: #555; margin: 0 0 24px;">
        Great news! <strong>${festivalName}</strong> has been approved and is now live on the site.
      </p>
      ${reason ? `<div style="background: #f7f7f7; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0;"><strong>Note:</strong> ${reason}</p>
      </div>` : ""}

      <a href="${SITE_URL}"
         style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
        View on Site
      </a>

      <p style="color: #999; font-size: 12px; margin-top: 32px;">Save Philly Festivals</p>
    </div>
  `.trim();

  return sendEmail({ to, subject: `Your festival has been approved: ${festivalName}`, html });
}

export async function sendFestivalRejected({ to, festivalName, reason }) {
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
      <h2 style="margin: 0 0 8px;">Submission Update</h2>
      <p style="color: #555; margin: 0 0 24px;">
        Unfortunately, <strong>${festivalName}</strong> was not approved at this time.
      </p>
      ${reason ? `<div style="background: #f7f7f7; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0;"><strong>Reason:</strong> ${reason}</p>
      </div>` : ""}

      <p style="color: #555;">Feel free to address the feedback and resubmit.</p>

      <p style="color: #999; font-size: 12px; margin-top: 32px;">Save Philly Festivals</p>
    </div>
  `.trim();

  return sendEmail({ to, subject: `Update on your submission: ${festivalName}`, html });
}

export async function sendTransactionalEmail(
  { to, subject, html, text },
  { client = resendClient, logger = console } = {}
) {
  if (!client) {
    logger.warn("[MAIL] Delivery skipped because the provider is not configured.");
    return { success: false, code: "provider_unconfigured" };
  }

  try {
    const response = await client.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
    });
    if (response?.error) {
      logger.error("[MAIL] Provider rejected an email delivery request.");
      return { success: false, code: "provider_error" };
    }
    return { success: true, id: response?.data?.id || null };
  } catch {
    logger.error("[MAIL] Email delivery request failed.");
    return { success: false, code: "provider_error" };
  }
}

export const scheduleEmailProvider = Object.freeze({
  send(message, { idempotencyKey } = {}) {
    if (!resendClient) return sendTransactionalEmail(message);
    return sendTransactionalEmail(message, {
      client: {
        emails: {
          send: (payload) => resendClient.emails.send(payload, idempotencyKey ? { idempotencyKey } : undefined),
        },
      },
    });
  },
});

// Producer notifications use the same server-only transactional boundary. Tests inject
// a provider and never instantiate or call Resend.
export const producerNotificationProvider = Object.freeze({
  send(message, { idempotencyKey } = {}) {
    if (!resendClient) return sendTransactionalEmail(message);
    return sendTransactionalEmail(message, {
      client: {
        emails: {
          send: (payload) => resendClient.emails.send(payload, idempotencyKey ? { idempotencyKey } : undefined),
        },
      },
    });
  },
});

async function sendEmail(message) {
  return sendTransactionalEmail(message);
}
