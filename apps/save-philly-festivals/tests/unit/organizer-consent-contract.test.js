import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

describe("F-05 persistence and orchestration contract", () => {
  it("uses one forward normalized migration with authorization, consent evidence, and bounded outbox state", () => {
    const schema = read("prisma/schema.prisma");
    const migration = read("prisma/migrations/20260804030000_organizer_mailing_consent/migration.sql");
    for (const model of ["OrganizerIntegration", "OrganizerMailingConsent", "OrganizerMailingConsentOrganizer", "OrganizerMailingOutbox"]) expect(schema).toContain(`model ${model}`);
    for (const status of ["pending", "processing", "completed", "failed", "suppressed"]) expect(schema).toContain(status);
    expect(schema).toMatch(/management_token_hash\s+String\s+@unique/);
    const consentModel = schema.match(/model OrganizerMailingConsent \{[\s\S]*?\n\}/)?.[0];
        expect(consentModel).not.toContain("Json");
    expect(migration).toContain('CREATE UNIQUE INDEX "OrganizerMailingOutbox_idempotency_key_key"');
    expect(migration).not.toMatch(/API_KEY|Bearer [A-Za-z0-9]|credential/i);
  });

  it("suppresses organizer-scoped revocation before N8N can claim work", () => {
    const outbox = read("src/features/organizer-consent/organizer-outbox-repository.js");

    expect(outbox).toContain("organizerMailingConsentOrganizer.findUnique");
    expect(outbox).toContain("organizerMailingSuppression.findUnique");
    expect(outbox).toMatch(/grant\.revoked_at\s*\|\|\s*grant\.suppressed_at\s*\|\|\s*suppression/);
    expect(outbox).toContain('status: "suppressed"');
  });

  it("keeps IDs and secrets server-side and makes N8N the sole outbox boundary", () => {
    const form = read("src/features/schedule-email/ScheduleEmailForm.jsx");
    const repo = read("src/features/organizer-consent/organizer-consent-repository.js");
    const claim = read("src/app/api/internal/n8n/organizer-subscriptions/claim/route.js");
    expect(form).not.toMatch(/localStorage.*(?:email|consent)/i);
    expect(repo).toContain("publishedSelectionWhere");
    expect(repo).toContain('authorization_status: "authorized"');
    expect(claim).toContain("authorizeN8nRequest(request)");
    expect(form).not.toMatch(/N8N_ORGANIZER_OUTBOX_SECRET|provider_result_id/);
  });
});
