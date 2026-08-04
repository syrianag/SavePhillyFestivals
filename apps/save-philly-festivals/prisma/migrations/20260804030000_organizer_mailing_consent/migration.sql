-- F-05 organizer mailing authorization, versioned visitor consent, and durable N8N outbox.
CREATE TYPE "OrganizerAuthorizationStatus" AS ENUM ('authorized', 'revoked');
CREATE TYPE "OrganizerConsentPreference" AS ENUM ('reminders', 'updates', 'discovery');
CREATE TYPE "OrganizerOutboxStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'suppressed');

CREATE TABLE "OrganizerIntegration" (
    "id" TEXT NOT NULL,
    "festival_id" TEXT NOT NULL,
    "organizer_name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "authorization_status" "OrganizerAuthorizationStatus" NOT NULL DEFAULT 'revoked',
    "authorization_granted_at" TIMESTAMP(3),
    "authorization_revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrganizerIntegration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizerMailingConsent" (
    "id" TEXT NOT NULL,
    "submission_key" TEXT NOT NULL,
    "request_fingerprint" TEXT NOT NULL,
    "normalized_email" TEXT NOT NULL,
    "consent_text" TEXT NOT NULL,
    "consent_version" INTEGER NOT NULL,
    "preference_version" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "request_ip" TEXT NOT NULL,
    "consented_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "suppressed_at" TIMESTAMP(3),
    "suppression_reason" TEXT,
    "management_token_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrganizerMailingConsent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizerMailingConsentFestival" (
    "consent_id" TEXT NOT NULL,
    "festival_id" TEXT NOT NULL,
    CONSTRAINT "OrganizerMailingConsentFestival_pkey" PRIMARY KEY ("consent_id", "festival_id")
);

CREATE TABLE "OrganizerMailingConsentOrganizer" (
    "consent_id" TEXT NOT NULL,
    "organizer_integration_id" TEXT NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "suppressed_at" TIMESTAMP(3),
    CONSTRAINT "OrganizerMailingConsentOrganizer_pkey" PRIMARY KEY ("consent_id", "organizer_integration_id")
);

CREATE TABLE "OrganizerMailingConsentPreferenceRecord" (
    "consent_id" TEXT NOT NULL,
    "preference" "OrganizerConsentPreference" NOT NULL,
    CONSTRAINT "OrganizerMailingConsentPreferenceRecord_pkey" PRIMARY KEY ("consent_id", "preference")
);

CREATE TABLE "OrganizerMailingSuppression" (
    "id" TEXT NOT NULL,
    "normalized_email" TEXT NOT NULL,
    "organizer_integration_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizerMailingSuppression_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizerMailingOutbox" (
    "id" TEXT NOT NULL,
    "consent_id" TEXT NOT NULL,
    "organizer_integration_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "status" "OrganizerOutboxStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_token_hash" TEXT,
    "lease_expires_at" TIMESTAMP(3),
    "provider_result_id" TEXT,
    "last_error_code" TEXT,
    "completed_at" TIMESTAMP(3),
    "suppressed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrganizerMailingOutbox_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrganizerIntegration_festival_id_idx" ON "OrganizerIntegration"("festival_id");
CREATE INDEX "OrganizerIntegration_enabled_authorization_status_idx" ON "OrganizerIntegration"("enabled", "authorization_status");
CREATE UNIQUE INDEX "OrganizerMailingConsent_submission_key_key" ON "OrganizerMailingConsent"("submission_key");
CREATE UNIQUE INDEX "OrganizerMailingConsent_management_token_hash_key" ON "OrganizerMailingConsent"("management_token_hash");
CREATE INDEX "OrganizerMailingConsent_normalized_email_idx" ON "OrganizerMailingConsent"("normalized_email");
CREATE INDEX "OrganizerMailingConsent_revoked_at_suppressed_at_idx" ON "OrganizerMailingConsent"("revoked_at", "suppressed_at");
CREATE INDEX "OrganizerMailingConsentOrganizer_organizer_integration_id_revoked_at_suppressed_at_idx" ON "OrganizerMailingConsentOrganizer"("organizer_integration_id", "revoked_at", "suppressed_at");
CREATE UNIQUE INDEX "OrganizerMailingSuppression_normalized_email_organizer_integration_id_key" ON "OrganizerMailingSuppression"("normalized_email", "organizer_integration_id");
CREATE INDEX "OrganizerMailingSuppression_organizer_integration_id_idx" ON "OrganizerMailingSuppression"("organizer_integration_id");
CREATE UNIQUE INDEX "OrganizerMailingOutbox_idempotency_key_key" ON "OrganizerMailingOutbox"("idempotency_key");
CREATE UNIQUE INDEX "OrganizerMailingOutbox_consent_id_organizer_integration_id_key" ON "OrganizerMailingOutbox"("consent_id", "organizer_integration_id");
CREATE INDEX "OrganizerMailingOutbox_status_next_attempt_at_idx" ON "OrganizerMailingOutbox"("status", "next_attempt_at");
CREATE INDEX "OrganizerMailingOutbox_lease_expires_at_idx" ON "OrganizerMailingOutbox"("lease_expires_at");

ALTER TABLE "OrganizerIntegration" ADD CONSTRAINT "OrganizerIntegration_festival_id_fkey" FOREIGN KEY ("festival_id") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizerMailingConsentFestival" ADD CONSTRAINT "OrganizerMailingConsentFestival_consent_id_fkey" FOREIGN KEY ("consent_id") REFERENCES "OrganizerMailingConsent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizerMailingConsentFestival" ADD CONSTRAINT "OrganizerMailingConsentFestival_festival_id_fkey" FOREIGN KEY ("festival_id") REFERENCES "Festival"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizerMailingConsentOrganizer" ADD CONSTRAINT "OrganizerMailingConsentOrganizer_consent_id_fkey" FOREIGN KEY ("consent_id") REFERENCES "OrganizerMailingConsent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizerMailingConsentOrganizer" ADD CONSTRAINT "OrganizerMailingConsentOrganizer_organizer_integration_id_fkey" FOREIGN KEY ("organizer_integration_id") REFERENCES "OrganizerIntegration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizerMailingConsentPreferenceRecord" ADD CONSTRAINT "OrganizerMailingConsentPreferenceRecord_consent_id_fkey" FOREIGN KEY ("consent_id") REFERENCES "OrganizerMailingConsent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizerMailingSuppression" ADD CONSTRAINT "OrganizerMailingSuppression_organizer_integration_id_fkey" FOREIGN KEY ("organizer_integration_id") REFERENCES "OrganizerIntegration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizerMailingOutbox" ADD CONSTRAINT "OrganizerMailingOutbox_consent_id_fkey" FOREIGN KEY ("consent_id") REFERENCES "OrganizerMailingConsent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizerMailingOutbox" ADD CONSTRAINT "OrganizerMailingOutbox_organizer_integration_id_fkey" FOREIGN KEY ("organizer_integration_id") REFERENCES "OrganizerIntegration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
