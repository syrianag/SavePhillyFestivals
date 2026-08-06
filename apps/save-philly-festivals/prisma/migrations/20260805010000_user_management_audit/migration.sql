-- Secure user lifecycle management with an append-only, revisioned audit ledger.
-- Existing accounts are retained as active legacy revision-zero rows. Every account
-- created or role/status mutation committed after this migration requires an audit row.

CREATE TYPE "UserAccountStatus" AS ENUM ('active', 'deactivated');
CREATE TYPE "UserAccountAuditAction" AS ENUM ('account_created', 'role_changed', 'status_changed', 'delete_equivalent');

ALTER TABLE "User"
  ADD COLUMN "status" "UserAccountStatus" NOT NULL DEFAULT 'active',
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "deactivated_at" TIMESTAMP(3),
  ADD CONSTRAINT "User_role_allowlist" CHECK ("role" IN ('public', 'producer', 'admin', 'super_admin')),
  ADD CONSTRAINT "User_revision_nonnegative" CHECK ("revision" >= 0),
  ADD CONSTRAINT "User_deactivation_coherence" CHECK (
    ("status" = 'active' AND "deactivated_at" IS NULL)
    OR ("status" = 'deactivated' AND "deactivated_at" IS NOT NULL)
  );

CREATE INDEX "User_status_role_created_at_idx" ON "User"("status", "role", "created_at");

CREATE TABLE "UserAccountTransition" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "actor_user_id" TEXT NOT NULL,
  "action" "UserAccountAuditAction" NOT NULL,
  "from_role" TEXT,
  "to_role" TEXT,
  "from_status" "UserAccountStatus",
  "to_status" "UserAccountStatus",
  "revision" INTEGER NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserAccountTransition_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserAccountTransition_revision_nonnegative" CHECK ("revision" >= 0),
  CONSTRAINT "UserAccountTransition_reason_bounded" CHECK ("reason" IS NULL OR char_length("reason") BETWEEN 1 AND 500),
  CONSTRAINT "UserAccountTransition_role_allowlist" CHECK (
    ("from_role" IS NULL OR "from_role" IN ('public', 'producer', 'admin', 'super_admin'))
    AND ("to_role" IS NULL OR "to_role" IN ('public', 'producer', 'admin', 'super_admin'))
  ),
  CONSTRAINT "UserAccountTransition_shape" CHECK (
    (
      "action" = 'account_created'
      AND "revision" = 0
      AND "from_role" IS NULL AND "to_role" IS NOT NULL
      AND "from_status" IS NULL AND "to_status" = 'active'
    ) OR (
      "action" = 'role_changed'
      AND "revision" > 0
      AND "from_role" IS NOT NULL AND "to_role" IS NOT NULL AND "from_role" <> "to_role"
      AND "from_status" IS NULL AND "to_status" IS NULL
    ) OR (
      "action" = 'status_changed'
      AND "revision" > 0
      AND "from_role" IS NULL AND "to_role" IS NULL
      AND "from_status" IS NOT NULL AND "to_status" IS NOT NULL AND "from_status" <> "to_status"
    ) OR (
      "action" = 'delete_equivalent'
      AND "revision" > 0
      AND "from_role" IS NULL AND "to_role" IS NULL
      AND "from_status" = 'active' AND "to_status" = 'deactivated'
    )
  )
);

CREATE UNIQUE INDEX "UserAccountTransition_user_id_revision_key" ON "UserAccountTransition"("user_id", "revision");
CREATE INDEX "UserAccountTransition_actor_user_id_created_at_idx" ON "UserAccountTransition"("actor_user_id", "created_at");
CREATE INDEX "UserAccountTransition_user_id_created_at_idx" ON "UserAccountTransition"("user_id", "created_at");

ALTER TABLE "UserAccountTransition" ADD CONSTRAINT "UserAccountTransition_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserAccountTransition" ADD CONSTRAINT "UserAccountTransition_actor_user_id_fkey"
FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "prevent_user_account_transition_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'User account transitions are immutable' USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "UserAccountTransition_immutable_trigger"
BEFORE UPDATE OR DELETE ON "UserAccountTransition"
FOR EACH ROW EXECUTE FUNCTION "prevent_user_account_transition_mutation"();

CREATE FUNCTION "audit_user_account_creation"()
RETURNS TRIGGER AS $$
DECLARE
  requested_actor TEXT;
  audit_actor TEXT;
BEGIN
  requested_actor := NULLIF(current_setting('app.user_management_actor_id', TRUE), '');
  IF requested_actor IS NOT NULL AND EXISTS (SELECT 1 FROM "User" actor WHERE actor."id" = requested_actor) THEN
    audit_actor := requested_actor;
  ELSE
    -- Bootstrap/local seed accounts have no pre-existing actor. Self-attribution keeps
    -- creation append-only and FK-backed; managed API creates set the real actor above.
    audit_actor := NEW."id";
  END IF;
  INSERT INTO "UserAccountTransition" (
    "id", "user_id", "actor_user_id", "action", "to_role", "to_status", "revision"
  ) VALUES (
    'account-created-' || NEW."id", NEW."id", audit_actor, 'account_created', NEW."role", NEW."status", 0
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "User_account_creation_audit_trigger"
AFTER INSERT ON "User"
FOR EACH ROW EXECUTE FUNCTION "audit_user_account_creation"();

CREATE FUNCTION "enforce_user_account_revision_and_super_admin"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Hard user deletion is forbidden; deactivate the account instead' USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW."revision" <> 0 OR NEW."status" <> 'active' OR NEW."deactivated_at" IS NOT NULL THEN
      RAISE EXCEPTION 'New users must enter active at revision zero' USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW."role" IS DISTINCT FROM OLD."role" OR NEW."status" IS DISTINCT FROM OLD."status" THEN
    IF NEW."revision" <> OLD."revision" + 1 THEN
      RAISE EXCEPTION 'User account revisions must increment by exactly one' USING ERRCODE = 'check_violation';
    END IF;
  ELSIF NEW."revision" <> OLD."revision" THEN
    RAISE EXCEPTION 'User account revision cannot change without a role or status transition' USING ERRCODE = 'check_violation';
  END IF;

  IF OLD."role" = 'super_admin' AND OLD."status" = 'active'
     AND (NEW."role" <> 'super_admin' OR NEW."status" <> 'active') THEN
    PERFORM pg_advisory_xact_lock(2026080501);
    IF NOT EXISTS (
      SELECT 1 FROM "User" other
      WHERE other."id" <> OLD."id" AND other."role" = 'super_admin' AND other."status" = 'active'
    ) THEN
      RAISE EXCEPTION 'Cannot remove the final active super admin' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "User_account_revision_trigger"
BEFORE INSERT OR UPDATE OR DELETE ON "User"
FOR EACH ROW EXECUTE FUNCTION "enforce_user_account_revision_and_super_admin"();

CREATE FUNCTION "verify_user_account_audit"()
RETURNS TRIGGER AS $$
DECLARE
  expected_action "UserAccountAuditAction";
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (
      SELECT 1 FROM "UserAccountTransition" transition
      WHERE transition."user_id" = NEW."id"
        AND transition."action" = 'account_created'
        AND transition."revision" = 0
        AND transition."to_role" = NEW."role"
        AND transition."to_status" = NEW."status"
    ) THEN
      RAISE EXCEPTION 'User creation requires a matching immutable audit transition' USING ERRCODE = 'check_violation';
    END IF;
    RETURN NULL;
  END IF;

  IF NEW."role" IS DISTINCT FROM OLD."role" THEN
    IF NEW."status" IS DISTINCT FROM OLD."status" THEN
      RAISE EXCEPTION 'Role and status must be changed in separate audited transitions' USING ERRCODE = 'check_violation';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM "UserAccountTransition" transition
      WHERE transition."user_id" = NEW."id"
        AND transition."action" = 'role_changed'
        AND transition."revision" = NEW."revision"
        AND transition."from_role" = OLD."role"
        AND transition."to_role" = NEW."role"
    ) THEN
      RAISE EXCEPTION 'User role change requires a matching immutable audit transition' USING ERRCODE = 'check_violation';
    END IF;
  ELSIF NEW."status" IS DISTINCT FROM OLD."status" THEN
    IF NOT EXISTS (
      SELECT 1 FROM "UserAccountTransition" transition
      WHERE transition."user_id" = NEW."id"
        AND transition."action" IN ('status_changed', 'delete_equivalent')
        AND transition."revision" = NEW."revision"
        AND transition."from_status" = OLD."status"
        AND transition."to_status" = NEW."status"
    ) THEN
      RAISE EXCEPTION 'User status change requires a matching immutable audit transition' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "User_account_insert_audit_commit_trigger"
AFTER INSERT ON "User"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "verify_user_account_audit"();

CREATE CONSTRAINT TRIGGER "User_account_update_audit_commit_trigger"
AFTER UPDATE ON "User"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "verify_user_account_audit"();

CREATE FUNCTION "verify_user_account_transition"()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."action" = 'account_created' THEN
    IF NOT EXISTS (
      SELECT 1 FROM "User" account
      WHERE account."id" = NEW."user_id" AND account."revision" = 0
        AND account."role" = NEW."to_role" AND account."status" = NEW."to_status"
    ) THEN
      RAISE EXCEPTION 'Account creation transition requires matching user state' USING ERRCODE = 'check_violation';
    END IF;
  ELSIF NEW."action" = 'role_changed' THEN
    IF NOT EXISTS (
      SELECT 1 FROM "User" account
      WHERE account."id" = NEW."user_id" AND account."revision" = NEW."revision"
        AND account."role" = NEW."to_role"
    ) THEN
      RAISE EXCEPTION 'Role transition requires matching user state' USING ERRCODE = 'check_violation';
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM "User" account
      WHERE account."id" = NEW."user_id" AND account."revision" = NEW."revision"
        AND account."status" = NEW."to_status"
    ) THEN
      RAISE EXCEPTION 'Status transition requires matching user state' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "UserAccountTransition_coherence_commit_trigger"
AFTER INSERT ON "UserAccountTransition"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "verify_user_account_transition"();
