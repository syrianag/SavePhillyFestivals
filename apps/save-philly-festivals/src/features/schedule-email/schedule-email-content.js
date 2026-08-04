import {
  formatPhiladelphiaDateTime,
} from "@/features/festivals/public-festival";

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeSiteUrl(value) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("unsupported protocol");
    return url.origin;
  } catch {
    return "https://savephillyfestivals.com";
  }
}

function itemDetails({ type, record }) {
  if (type === "festival") {
    return {
      label: "Festival",
      title: record.name,
      detail: [formatPhiladelphiaDateTime(record.start_date), record.location].filter(Boolean).join(" · "),
      slug: record.slug,
    };
  }

  return {
    label: "Program event",
    title: record.title,
    detail: [
      record.festival?.name,
      formatPhiladelphiaDateTime(record.start_time),
      record.location,
    ].filter(Boolean).join(" · "),
    slug: record.festival?.slug,
  };
}

export function buildScheduleEmailContent({ resolved, unavailableCount = 0, siteUrl }) {
  const origin = safeSiteUrl(siteUrl);
  const rows = resolved.map((item) => {
    const details = itemDetails(item);
    const title = escapeHtml(details.title);
    const detail = escapeHtml(details.detail);
    const href = details.slug
      ? `${origin}/festivals/${encodeURIComponent(details.slug)}`
      : `${origin}/calendar`;
    return `<li style="margin:0 0 16px"><strong>${escapeHtml(details.label)}: <a href="${escapeHtml(href)}">${title}</a></strong>${detail ? `<br><span>${detail}</span>` : ""}</li>`;
  }).join("");

  const unavailableHtml = unavailableCount > 0
    ? `<p><strong>${unavailableCount}</strong> saved ${unavailableCount === 1 ? "selection was" : "selections were"} unavailable and was not included. Your browser schedule has not been changed.</p>`
    : "";
  const textRows = resolved.map((item) => {
    const details = itemDetails(item);
    return `${details.label}: ${details.title}${details.detail ? ` — ${details.detail}` : ""}`;
  });
  const unavailableText = unavailableCount > 0
    ? `\n${unavailableCount} saved ${unavailableCount === 1 ? "selection was" : "selections were"} unavailable and was not included. Your browser schedule has not been changed.`
    : "";

  return {
    subject: "Your Save Philly Festivals schedule",
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px"><h1>Your festival schedule</h1><p>Here is the schedule you requested.</p><ul style="padding-left:20px">${rows}</ul>${unavailableHtml}<p><a href="${escapeHtml(`${origin}/calendar`)}">Open the Schedule Builder</a></p><p style="color:#666;font-size:12px">This transactional email was requested from the Schedule Builder. It does not subscribe you to marketing.</p></div>`,
    text: `Your festival schedule\n\n${textRows.join("\n")}${unavailableText}\n\nOpen the Schedule Builder: ${origin}/calendar\n\nThis transactional email does not subscribe you to marketing.`,
  };
}
