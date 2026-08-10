-- CreateEnum
CREATE TYPE "SponsorSlot" AS ENUM ('left_rail', 'right_rail', 'footer');

-- CreateEnum
CREATE TYPE "SponsorStatus" AS ENUM ('draft', 'active', 'archived');

-- AlterTable
ALTER TABLE "Festival" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "featured_rank" INTEGER;

-- CreateTable
CREATE TABLE "Sponsor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slot" "SponsorSlot" NOT NULL,
    "status" "SponsorStatus" NOT NULL DEFAULT 'draft',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "href" TEXT,
    "alt_text" TEXT,
    "image_url" TEXT,
    "image_width" INTEGER,
    "image_height" INTEGER,
    "pill_color" TEXT,
    "text_color" TEXT,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sponsor_slot_status_sort_order_idx" ON "Sponsor"("slot", "status", "sort_order");

-- CreateIndex
CREATE INDEX "Festival_featured_featured_rank_idx" ON "Festival"("featured", "featured_rank");
