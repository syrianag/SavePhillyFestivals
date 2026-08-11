/**
 * Delivery for password-reset emails.
 *
 * Gated on `PASSWORD_RESET_EMAILS_ENABLED`, its own switch, rather than reusing
 * `ACCOUNT_EMAILS_ENABLED`. Account recovery is the one transactional email that should be able to
 * run on a deployment which has deliberately not armed anything else: `ACCOUNT_EMAILS_ENABLED`
 * exists to keep producer-access decision mail off while 1,600+ imported organizer contacts sit in
 * the database, and a locked-out admin should not have to make that trade to get back in.
 *
 * The copy is intentionally hard-coded here rather than living in `EmailTemplate`. A client-editable
 * body could be disabled, or saved without `{{reset_url}}`, and account recovery would break
 * silently with no failing test to catch it. If the client later wants control, the safe version of
 * that feature validates the placeholder's presence and refuses to disable this key.
 */

const TTL_MINUTES = 30;

export function passwordResetEmailsEnabled(
  flag = process.env.PASSWORD_RESET_EMAILS_ENABLED,
  apiKey = process.env.RESEND_API_KEY,
) {
  return flag === "1" && Boolean(apiKey);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildResetUrl(token, siteUrl = process.env.NEXT_PUBLIC_SITE_URL) {
  const base = (siteUrl || "https://savephillyfestivals.com").replace(/\/+$/, "");
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}

export function renderPasswordResetEmail({ resetUrl, name }) {
  const safeUrl = escapeHtml(resetUrl);
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";

  return {
    subject: "Reset your Save Philly Festivals password",
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
        <h2 style="margin: 0 0 8px;">Reset your password</h2>
        <p style="color: #555; margin: 0 0 24px;">${greeting} we received a request to reset the password for this account.</p>

        <a href="${safeUrl}"
           style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
          Choose a new password
        </a>

        <p style="color: #555; margin: 24px 0 0;">
          This link works once and expires in ${TTL_MINUTES} minutes.
        </p>
        <p style="color: #555; margin: 8px 0 0;">
          If you didn't ask for this, you can ignore this email — your password will not change.
        </p>

        <p style="color: #999; font-size: 12px; margin-top: 32px;">Save Philly Festivals</p>
      </div>
    `.trim(),
    text: [
      `${name ? `Hi ${name},` : "Hi,"} we received a request to reset the password for this account.`,
      "",
      "Choose a new password:",
      resetUrl,
      "",
      `This link works once and expires in ${TTL_MINUTES} minutes.`,
      "If you didn't ask for this, you can ignore this email — your password will not change.",
      "",
      "Save Philly Festivals",
    ].join("\n"),
  };
}

/**
 * Sends the reset email. Never throws: the caller returns the same generic response either way, so
 * a provider outage must not turn into a 500 that tells an attacker the address exists.
 */
export async function sendPasswordResetEmail({ to, resetUrl, name }, injected) {
  if (!(injected?.enabled ?? passwordResetEmailsEnabled())) {
    return { delivered: false, reason: "provider_unconfigured" };
  }

  try {
    const send = injected?.send || (await import("@/lib/mail")).sendTransactionalEmail;
    const result = await send({ to, ...renderPasswordResetEmail({ resetUrl, name }) });
    return { delivered: Boolean(result?.success), reason: result?.success ? null : result?.code || "provider_error" };
  } catch {
    /* No address, token, or provider payload in the log line — this runs on the unauthenticated
     * path and the logs are not a place to reconstruct reset links from. */
    console.error("[PASSWORD RESET] Reset email failed to send.");
    return { delivered: false, reason: "provider_error" };
  }
}
