-- Digital "Our Festivals" gallery: editor-curated imagery, independent of the festival
-- publication workflow. Visibility is governed by this table's own `status`.

CREATE TYPE "OurFestivalItemStatus" AS ENUM ('draft', 'published', 'archived');

CREATE TABLE "OurFestivalItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caption" TEXT,
    "festival_id" TEXT,
    "image_url" TEXT NOT NULL,
    "image_width" INTEGER,
    "image_height" INTEGER,
    "alt_text" TEXT NOT NULL,
    "status" "OurFestivalItemStatus" NOT NULL DEFAULT 'draft',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OurFestivalItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OurFestivalItem_status_sort_order_created_at_idx"
    ON "OurFestivalItem"("status", "sort_order", "created_at");

CREATE INDEX "OurFestivalItem_festival_id_idx"
    ON "OurFestivalItem"("festival_id");

-- SET NULL rather than CASCADE: deleting a festival must not silently destroy curated
-- editorial imagery that references it.
ALTER TABLE "OurFestivalItem"
    ADD CONSTRAINT "OurFestivalItem_festival_id_fkey"
    FOREIGN KEY ("festival_id") REFERENCES "Festival"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
