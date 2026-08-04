import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "coverage",
      include: [
        "src/lib/ics.js",
        "src/lib/validate.js",
        "src/lib/uploads.js",
        "src/features/festivals/festival-schemas.js",
        "src/features/schedule/schedule-storage.js",
      ],
    },
  },
});
