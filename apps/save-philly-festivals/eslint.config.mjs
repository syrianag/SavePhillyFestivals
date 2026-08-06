import { defineConfig, globalIgnores } from "eslint/config";
import nextConfig from "eslint-config-next";

export default defineConfig([
  ...nextConfig,
  // Generated and build output. The editor's ESLint extension lints the whole
  // project, not just the `src/` path the lint target passes, so anything not
  // ignored here shows up in the Problems panel even when `pnpm run lint` is clean.
  globalIgnores([
    "src/generated/prisma/**",
    ".next/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);
