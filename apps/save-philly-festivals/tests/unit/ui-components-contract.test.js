import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "../..");
const read = (path) => readFileSync(resolve(projectRoot, path), "utf8");

describe("UI components contract", () => {
  it("enforces that admin/producer feature components import from @/components/ui/*", () => {
    const files = [
      "src/features/editorial-workflow/AdminFestivalList.jsx",
      "src/features/editorial-workflow/AdminFestivalDetail.jsx",
      "src/features/editorial-workflow/AdminFestivalEditor.jsx",
      "src/features/editorial-workflow/FestivalGeocodeNotice.jsx",
      "src/features/social-feed/AdminSocialFeedManager.jsx",
      "src/features/producer-submission/ProducerSubmissionEditor.jsx",
      "src/features/festival-import/AdminImportBatchList.jsx",
      "src/features/festival-import/AdminImportBatchDetail.jsx",
      "src/features/sponsors/AdminSponsorList.jsx",
      "src/features/producer-access/AdminProducerRequests.jsx",
      "src/features/producer-access/AdminEmailTemplates.jsx",
      "src/features/producer-access/ProducerAccessPanel.jsx",
      "src/features/our-festivals/AdminOurFestivalsList.jsx",
      "src/features/navigation/AdminNavigationLinks.jsx",
      "src/features/schedules/AdminFestivalSchedule.jsx",
    ];

    for (const file of files) {
      const content = read(file);
      
      // If the component is used, it should be imported from "@/components/ui/..."
      if (content.includes("<Button")) {
        expect(content).toMatch(/@\/components\/ui\/button/);
      }
      if (content.includes("<Badge")) {
        expect(content).toMatch(/@\/components\/ui\/badge/);
      }
      if (content.includes("<Card")) {
        expect(content).toMatch(/@\/components\/ui\/card/);
      }
      if (content.includes("<Dialog")) {
        expect(content).toMatch(/@\/components\/ui\/dialog/);
      }
    }
  });
});
