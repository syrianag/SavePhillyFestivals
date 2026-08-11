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
        "src/features/festivals/geocoding.js",
        "src/features/schedule/schedule-storage.js",
        "src/features/sponsors/sponsor-placements.js",
        "src/features/schedule-email/schedule-email-content.js",
        "src/features/schedule-email/schedule-email-resolution.js",
        "src/features/schedule-email/schedule-email-schema.js",
        "src/features/schedule-email/schedule-email-service.js",
        "src/features/password-reset/password-reset-schema.js",
        "src/features/password-reset/password-reset-security.js",
        "src/features/password-reset/password-reset-service.js",
        "src/features/password-reset/password-reset-notifications.js",
        "src/lib/session-validity.js",
        "src/lib/mail.js",
      ],
    },
  },
});
