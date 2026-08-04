-- Existing privileged users retain their assigned role. New users default to the
-- least-privileged public role and must be promoted through an authorized flow.
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'public';
