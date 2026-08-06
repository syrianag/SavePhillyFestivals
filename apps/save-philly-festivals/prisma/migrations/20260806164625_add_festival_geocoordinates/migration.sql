-- Map pin coordinates for Festival.
--
-- Scoped deliberately to these four columns. `prisma migrate dev --create-only` also
-- emitted a DropForeignKey, a DropIndex, and a set of index/constraint renames: those are
-- shadow-database naming reconciliation between the committed migration history and the
-- schema's implicit index names, not part of this feature. `prisma migrate status` reports
-- no drift against the live database. Shipping an unrelated foreign-key drop inside a
-- migration named "add geocoordinates" would be unreviewable, so it is left out; if that
-- reconciliation is wanted it belongs in its own reviewed migration.
ALTER TABLE "Festival" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "geocoded_at" TIMESTAMP(3),
ADD COLUMN     "geocode_source" TEXT;
