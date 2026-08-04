export const PHILADELPHIA_TIME_ZONE = "America/New_York";

export const PUBLIC_FESTIVAL_SELECT = Object.freeze({
  id: true,
  name: true,
  slug: true,
  description: true,
  location: true,
  city: true,
  state: true,
  zip_code: true,
  website_url: true,
  image_url: true,
  logo_url: true,
  social_instagram: true,
  social_facebook: true,
  social_twitter: true,
  social_tiktok: true,
  social_youtube: true,
  story: true,
  mission: true,
  history: true,
  start_date: true,
  end_date: true,
  schedules: {
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      start_time: true,
      end_time: true,
      performer: true,
      genre: true,
      is_headliner: true,
    },
    orderBy: { start_time: "asc" },
  },
  categories: {
    select: { category: { select: { name: true, slug: true } } },
  },
  tags: {
    select: { tag: { select: { name: true, slug: true } } },
  },
});

const SOCIAL_NETWORKS = [
  { field: "social_instagram", label: "Instagram", hosts: ["instagram.com"] },
  { field: "social_facebook", label: "Facebook", hosts: ["facebook.com", "fb.com"] },
  { field: "social_twitter", label: "Twitter / X", hosts: ["twitter.com", "x.com"] },
  { field: "social_tiktok", label: "TikTok", hosts: ["tiktok.com"] },
  {
    field: "social_youtube",
    label: "YouTube",
    hosts: ["youtube.com", "youtu.be"],
  },
];

function hostnameMatches(hostname, supportedHosts) {
  return supportedHosts.some((host) => hostname === host || hostname === `www.${host}`);
}

export function validateOfficialSocialUrl(value, supportedHosts) {
  if (!value || typeof value !== "string") return null;

  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !hostnameMatches(url.hostname.toLowerCase(), supportedHosts)
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function getOfficialSocialLinks(festival) {
  return SOCIAL_NETWORKS.flatMap(({ field, label, hosts }) => {
    const url = validateOfficialSocialUrl(festival?.[field], hosts);
    return url ? [{ label, url }] : [];
  });
}

export function validatePublicImageUrl(value) {
  if (!value || typeof value !== "string") return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;

  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function validatePublicWebsiteUrl(value) {
  if (!value || typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function asDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatPhiladelphiaDate(value, options = {}) {
  const date = asDate(value);
  if (!date) return null;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHILADELPHIA_TIME_ZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  }).format(date);
}

export function formatPhiladelphiaTime(value) {
  const date = asDate(value);
  if (!date) return null;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHILADELPHIA_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function formatPhiladelphiaDateTime(value) {
  const date = asDate(value);
  if (!date) return null;
  return `${formatPhiladelphiaDate(date)} at ${formatPhiladelphiaTime(date)}`;
}

export function mapPublicFestival(record) {
  if (!record) return null;

  const categories = (record.categories || [])
    .map(({ category }) =>
      category?.name ? { name: category.name, slug: category.slug || null } : null
    )
    .filter(Boolean);
  const tags = (record.tags || [])
    .map(({ tag }) => (tag?.name ? { name: tag.name, slug: tag.slug || null } : null))
    .filter(Boolean);
  const schedules = (record.schedules || [])
    .map((schedule) => ({
      id: schedule.id,
      title: schedule.title,
      description: schedule.description || null,
      location: schedule.location || null,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      performer: schedule.performer || null,
      genre: schedule.genre || null,
      is_headliner: Boolean(schedule.is_headliner),
    }))
    .sort(
      (left, right) =>
        (asDate(left.start_time)?.getTime() || 0) - (asDate(right.start_time)?.getTime() || 0)
    );
  const locality = [record.city, record.state].filter(Boolean).join(", ");
  const address = [locality, record.zip_code].filter(Boolean).join(" ");

  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    description: record.description?.trim() || "Festival details are coming soon.",
    location: record.location || null,
    city: record.city || null,
    state: record.state || null,
    zip_code: record.zip_code || null,
    website_url: validatePublicWebsiteUrl(record.website_url),
    image_url:
      validatePublicImageUrl(record.image_url) || validatePublicImageUrl(record.logo_url) || null,
    story: record.story || null,
    mission: record.mission || null,
    history: record.history || null,
    start_date: record.start_date || null,
    end_date: record.end_date || null,
    categories,
    tags,
    schedules,
    socialLinks: getOfficialSocialLinks(record),
    dateLabel: record.start_date
      ? formatPhiladelphiaDateTime(record.start_date)
      : "Dates and times to be announced",
    endDateLabel: record.end_date ? formatPhiladelphiaDateTime(record.end_date) : null,
    locationLabel: record.location?.trim() || "Location to be announced",
    addressLabel: address || "Address details to be announced",
  };
}
