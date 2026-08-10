/**
 * Admin-editable transactional email copy.
 *
 * Templates are stored as text with `{{token}}` placeholders and rendered by substitution only.
 * Nothing in a template body is evaluated, so an editor with access to this screen cannot turn
 * copy into code — which matters because the people editing it are non-technical and the output
 * is emailed to third parties.
 */

/** Tokens each template may use, so the admin screen can show what is available. */
export const TEMPLATE_TOKENS = Object.freeze({
  producer_access_approved: ["name", "email", "site_url", "producer_url"],
  producer_access_rejected: ["name", "email", "site_url", "reason"],
});

export const DEFAULT_TEMPLATES = Object.freeze([
  {
    key: "producer_access_approved",
    name: "Producer access approved",
    description: "Sent when an administrator approves a producer access request.",
    subject: "Your producer access is approved",
    body: [
      "Hi {{name}},",
      "",
      "Your request for producer access to Save Philly Festivals has been approved.",
      "",
      "You can now sign in and submit a festival: {{producer_url}}",
      "",
      "Submissions stay private until our team reviews and publishes them.",
      "",
      "— Save Philly Festivals",
    ].join("\n"),
  },
  {
    key: "producer_access_rejected",
    name: "Producer access declined",
    description: "Sent when an administrator declines a producer access request. Includes the reason.",
    subject: "About your producer access request",
    body: [
      "Hi {{name}},",
      "",
      "Thanks for your interest in listing a festival on Save Philly Festivals.",
      "We are not able to approve producer access for this account right now.",
      "",
      "{{reason}}",
      "",
      "If you think this was a mistake, reply to this message and we will take another look.",
      "",
      "— Save Philly Festivals",
    ].join("\n"),
  },
]);

const TOKEN_PATTERN = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

/** Substitutes `{{token}}` values. Unknown tokens are dropped rather than left visible. */
export function renderTemplate(text, values) {
  return String(text ?? "").replace(TOKEN_PATTERN, (_match, token) => {
    const value = values?.[token.toLowerCase()];
    return value == null ? "" : String(value);
  });
}

/** Tokens actually used by a body, so the admin screen can flag typos before a send. */
export function tokensUsed(text) {
  return [...new Set([...String(text ?? "").matchAll(TOKEN_PATTERN)].map(([, token]) => token.toLowerCase()))];
}

export function unknownTokens(text, key) {
  const allowed = new Set(TEMPLATE_TOKENS[key] || []);
  return tokensUsed(text).filter((token) => !allowed.has(token));
}

/* Escapes template output before it lands in an HTML email. The values are user-supplied —
 * an applicant's own name, an editor's rejection reason — so they are data, not markup. */
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderTemplateHtml(body, values) {
  const rendered = renderTemplate(body, values);
  const paragraphs = rendered
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 16px;">${escapeHtml(block).replaceAll("\n", "<br />")}</p>`)
    .join("");
  return `<div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; color:#111;">${paragraphs}</div>`;
}
