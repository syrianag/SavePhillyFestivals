import { createHash } from "node:crypto";

export const FESTIVAL_IMPORT_TIME_ZONE = "America/New_York";
export const FESTIVAL_IMPORT_TEXT_LIMITS = Object.freeze({
  name: 200,
  location: 500,
  sourceType: 100,
  website: 2048,
  contactName: 200,
  contactEmail: 320,
  contactPhone: 100,
  futureDates: 500,
  emailSent: 32,
});

const UNSAFE_CONTROL_CHARACTERS = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/u;
const SINGLE_EMAIL = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/iu;
const DATE_ONLY = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/u;
const CATEGORY_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function hash(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function canonicalJson(entries) {
  return JSON.stringify(entries);
}

function addIssue(collection, code, field, message) {
  collection.push(Object.freeze({ code, field, message }));
}

function normalizeWhitespace(value) {
  return value.replace(/\r\n?|\n/gu, " ").replace(/[\t ]+/gu, " ").trim();
}

function text(rawValue, field, limit, errors) {
  const value = normalizeWhitespace(String(rawValue ?? ""));
  if (!value) return null;
  if (UNSAFE_CONTROL_CHARACTERS.test(value)) {
    addIssue(errors, "control_character", field, `${field} contains a control character`);
    return null;
  }
  if (value.length > limit) {
    addIssue(errors, "text_too_long", field, `${field} exceeds ${limit} characters`);
    return null;
  }
  return value;
}

function identityText(value) {
  return (value ?? "").normalize("NFKC").toLocaleLowerCase("en-US").replace(/\s+/gu, " ").trim();
}

function daysInMonth(year, month) {
  if (month === 2) return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function parseFestivalImportDate(value) {
  const match = DATE_ONLY.exec(value ?? "");
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function validateFestivalCategoryMap(categoryMap) {
  if (!categoryMap || categoryMap.version !== 1 || !Array.isArray(categoryMap.categories)) {
    throw new TypeError("Category map must use the version 1 categories contract");
  }
  const aliases = new Map();
  const slugs = new Set();
  for (const category of categoryMap.categories) {
    if (!category || !CATEGORY_SLUG.test(category.slug) || !Array.isArray(category.aliases) || category.aliases.length === 0) {
      throw new TypeError("Each mapped category requires a valid slug and at least one alias");
    }
    if (slugs.has(category.slug)) throw new TypeError(`Duplicate category slug: ${category.slug}`);
    slugs.add(category.slug);
    for (const alias of category.aliases) {
      const normalized = identityText(alias);
      if (!normalized || aliases.has(normalized)) throw new TypeError(`Duplicate or blank category alias: ${alias}`);
      aliases.set(normalized, category.slug);
    }
  }
  return aliases;
}

export function mapFestivalCategory(sourceType, categoryMap) {
  const normalized = identityText(sourceType);
  if (!normalized) return null;
  return validateFestivalCategoryMap(categoryMap).get(normalized) ?? null;
}

export function normalizeFestivalUrl(value) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || !parsed.hostname) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function normalizeFestivalEmail(value) {
  if (!value || !SINGLE_EMAIL.test(value)) return null;
  return value.toLowerCase();
}

export function createFestivalImportSlug(name, canonicalRowHash) {
  const base = identityText(name)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 180)
    .replace(/-+$/u, "") || "festival";
  if (!/^[a-f0-9]{64}$/u.test(canonicalRowHash)) throw new TypeError("A SHA-256 canonical row hash is required");
  return `${base}-${canonicalRowHash.slice(0, 8)}`;
}

export function normalizeFestivalImportRecord(record, { categoryMap } = {}) {
  if (!record?.values || !Number.isSafeInteger(record.recordNumber) || !Number.isSafeInteger(record.startLine)) {
    throw new TypeError("A parsed festival CSV record with metadata is required");
  }
  const aliases = validateFestivalCategoryMap(categoryMap);
  const raw = record.values;
  const errors = [];
  const warnings = [];

  const name = text(raw["Festival Name"], "name", FESTIVAL_IMPORT_TEXT_LIMITS.name, errors);
  const startSource = text(raw["Start Date"], "startDate", FESTIVAL_IMPORT_TEXT_LIMITS.futureDates, errors);
  const endSource = text(raw["End Date"], "endDate", FESTIVAL_IMPORT_TEXT_LIMITS.futureDates, errors);
  const futureDates = text(raw["2027 Dates (if applicable)"], "futureDates", FESTIVAL_IMPORT_TEXT_LIMITS.futureDates, errors);
  const location = text(raw.Location, "location", FESTIVAL_IMPORT_TEXT_LIMITS.location, errors);
  const sourceType = text(raw.Type, "sourceType", FESTIVAL_IMPORT_TEXT_LIMITS.sourceType, errors);
  const websiteSource = text(raw.Website, "website", FESTIVAL_IMPORT_TEXT_LIMITS.website, errors);
  const contactName = text(raw["Organiser/Contact"], "contactName", FESTIVAL_IMPORT_TEXT_LIMITS.contactName, errors);
  const contactEmailSource = text(raw["Contact email"], "contactEmail", FESTIVAL_IMPORT_TEXT_LIMITS.contactEmail, errors);
  const contactPhone = text(raw["Contact Phone"], "contactPhone", FESTIVAL_IMPORT_TEXT_LIMITS.contactPhone, errors);
  const emailSent = text(raw["Email sent?"], "emailSent", FESTIVAL_IMPORT_TEXT_LIMITS.emailSent, errors);

  if (!name) addIssue(errors, "blank_name", "name", "Festival name is required");

  const allDayStart = parseFestivalImportDate(startSource);
  if (!startSource) {
    addIssue(errors, "blank_start_date", "startDate", "Start date is required");
  } else if (!allDayStart) {
    addIssue(errors, "invalid_start_date", "startDate", "Start date must be a possible M/D/YYYY date");
  }

  let allDayEnd = null;
  if (allDayStart) {
    if (!endSource) {
      allDayEnd = allDayStart;
    } else {
      allDayEnd = parseFestivalImportDate(endSource);
      if (!allDayEnd) addIssue(errors, "invalid_end_date", "endDate", "End date must be a possible M/D/YYYY date");
      else if (allDayEnd < allDayStart) addIssue(errors, "end_before_start", "endDate", "End date must be on or after start date");
    }
  } else if (endSource && !parseFestivalImportDate(endSource)) {
    addIssue(errors, "invalid_end_date", "endDate", "End date must be a possible M/D/YYYY date");
  }

  const websiteUrl = normalizeFestivalUrl(websiteSource);
  if (websiteSource && !websiteUrl) addIssue(warnings, "invalid_url", "website", "Website was omitted because it is not a safe absolute HTTP(S) URL");

  const contactEmail = normalizeFestivalEmail(contactEmailSource);
  if (contactEmailSource && !contactEmail) addIssue(warnings, "invalid_or_multiple_email", "contactEmail", "Contact email was omitted because it is not one unambiguous mailbox");

  const categorySlug = sourceType ? aliases.get(identityText(sourceType)) ?? null : null;
  if (sourceType && !categorySlug) addIssue(errors, "unmapped_category", "sourceType", "Source type is not an approved category alias");
  if (!sourceType) addIssue(warnings, "blank_category", "sourceType", "Source type is blank");
  if (futureDates) addIssue(warnings, "future_dates_require_review", "futureDates", "Future or recurring dates were retained for editorial review");

  const normalizedForHash = [
    ["name", name], ["start", allDayStart], ["end", allDayEnd], ["futureDates", futureDates],
    ["location", location], ["sourceType", sourceType], ["categorySlug", categorySlug], ["websiteUrl", websiteUrl],
    ["contactName", contactName], ["contactEmail", contactEmail], ["contactPhone", contactPhone], ["emailSent", emailSent],
  ];
  const canonicalRowHash = hash(canonicalJson(normalizedForHash));
  const duplicateCandidateHash = hash(canonicalJson([
    ["name", identityText(name)],
    ["start", allDayStart],
  ]));
  const slug = createFestivalImportSlug(name, canonicalRowHash);

  const applyPayload = Object.freeze({
    name,
    slug,
    location,
    website_url: websiteUrl,
    category_slug: categorySlug,
    calendar_date_type: "all_day",
    time_zone: FESTIVAL_IMPORT_TIME_ZONE,
    all_day_start: allDayStart,
    all_day_end: allDayEnd,
    contact_name: contactName,
    contact_email: contactEmail,
    contact_phone: contactPhone,
    source_2027_dates: futureDates,
    source_email_sent: emailSent,
  });
  const redactedPayload = Object.freeze({
    name,
    slug,
    location,
    website_url: websiteUrl,
    category_slug: categorySlug,
    calendar_date_type: "all_day",
    time_zone: FESTIVAL_IMPORT_TIME_ZONE,
    all_day_start: allDayStart,
    all_day_end: allDayEnd,
    source_2027_dates: futureDates,
    source_email_sent: emailSent,
  });

  return Object.freeze({
    recordNumber: record.recordNumber,
    startLine: record.startLine,
    disposition: errors.length ? "quarantined" : "ready",
    errors: Object.freeze(errors),
    warnings: Object.freeze(warnings),
    canonicalRowHash,
    duplicateCandidateHash,
    slug,
    applyPayload,
    redactedPayload,
  });
}
