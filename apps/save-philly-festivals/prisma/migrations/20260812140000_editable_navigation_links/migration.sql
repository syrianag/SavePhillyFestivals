-- Editable public navigation: header and footer link lists an admin can change without a deploy.
--
-- No data is inserted here. `ensureDefaultNavigationLinks()` materialises the current hardcoded
-- menu on first admin read, and those same constants stay the render-time fallback, so an empty
-- table is a valid state rather than a blank navigation bar.

CREATE TYPE "NavigationPlacement" AS ENUM ('header', 'footer');

CREATE TABLE "NavigationLink" (
    "id" TEXT NOT NULL,
    "placement" "NavigationPlacement" NOT NULL,
    "section" TEXT,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NavigationLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NavigationLink_placement_visible_sort_order_idx"
    ON "NavigationLink"("placement", "visible", "sort_order");
