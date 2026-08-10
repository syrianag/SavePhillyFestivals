import { renderTemplate, renderTemplateHtml } from "./email-template-service";

/**
 * Delivery for account-decision emails.
 *
 * Gated on its own switch, `ACCOUNT_EMAILS_ENABLED`, rather than on the presence of
 * `RESEND_API_KEY` alone. That separation is deliberate and load-bearing: festival workflow
 * transitions also send through Resend, addressed to organizer contact details imported from
 * the source spreadsheet. Turning on account emails must not simultaneously arm 1,600+ festival
 * notification rows aimed at people who never signed up for anything.
 *
 * Failures never propagate. An approval that has already committed must not be reported as
 * failed because an email bounced — the decision is the source of truth, the email is a
 * courtesy, and the outcome is recorded either way.
 */
export function accountEmailsEnabled() {
  return process.env.ACCOUNT_EMAILS_ENABLED === "1" && Boolean(process.env.RESEND_API_KEY);
}

export async function sendAccountDecisionEmail({ template, to, values }) {
  if (!template?.enabled) return { delivered: false, reason: "template_disabled" };
  if (!accountEmailsEnabled()) return { delivered: false, reason: "provider_unconfigured" };

  try {
    const { sendTransactionalEmail } = await import("@/lib/mail");
    const result = await sendTransactionalEmail({
      to,
      subject: renderTemplate(template.subject, values),
      html: renderTemplateHtml(template.body, values),
    });
    return { delivered: Boolean(result?.success), reason: result?.success ? null : result?.code || "provider_error" };
  } catch (error) {
    console.error("[PRODUCER ACCESS] Decision email failed to send.", error?.message);
    return { delivered: false, reason: "provider_error" };
  }
}
