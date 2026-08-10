import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "../..");
const read = (path) => readFileSync(resolve(projectRoot, path), "utf8");
const countOf = (content, pattern) => content.match(pattern)?.length ?? 0;

/* Section shells: each route group owns its own chrome. The regression this guards against is
 * concrete — the root layout used to render the public NavBar for every route while suppressing
 * only the footer for staff roles, so admin and producer screens rendered two stacked
 * navigation bars, and an editor browsing the public site silently lost the footer and the
 * sponsor placements. */
const SECTION_SHELLS = [
  { name: "public", path: "src/components/layouts/PublicLayout.jsx", publicChrome: true },
  { name: "admin", path: "src/app/admin/layout.jsx", publicChrome: false },
  { name: "producer", path: "src/features/producer-submission/ProducerShell.jsx", publicChrome: false },
  { name: "auth", path: "src/app/(auth)/layout.jsx", publicChrome: false },
];

describe("layout contract", () => {
  it("keeps navigation and footer out of the root document shell", () => {
    const root = read("src/app/layout.js");
    expect(root).not.toMatch(/components\/shared\/NavBar/);
    expect(root).not.toMatch(/components\/shared\/Footer/);
    expect(root).not.toMatch(/SponsorRail/);
    /* The root layout runs on every request including purely public pages; resolving a session
     * here just to pick chrome put an auth lookup on the hottest path in the app. */
    expect(root).not.toMatch(/from "@\/lib\/auth"/);
    expect(countOf(root, /<main[\s>]/g)).toBe(0);
  });

  it.each(SECTION_SHELLS)("gives the $name section exactly one main landmark", ({ path }) => {
    const content = read(path);
    /* Matches the opening tag with its id, so prose mentioning <main> in a comment does not
     * count as a second landmark. */
    expect(countOf(content, /<main\s+id="main-content"/g)).toBe(1);
    expect(content).toMatch(/SkipLink/);
  });

  it.each(SECTION_SHELLS.filter((shell) => !shell.publicChrome))(
    "keeps visitor navigation out of the $name section",
    ({ path }) => {
      const content = read(path);
      expect(content).not.toMatch(/components\/shared\/NavBar/);
      expect(content).not.toMatch(/components\/shared\/Footer/);
    }
  );

  it("renders the public shell only from the (public) route group", () => {
    expect(read("src/app/(public)/layout.jsx")).toMatch(/PublicLayout/);
    const publicShell = read("src/components/layouts/PublicLayout.jsx");
    expect(publicShell).toMatch(/components\/shared\/NavBar/);
    expect(publicShell).toMatch(/components\/shared\/Footer/);
    /* One NavBar, one Footer — a duplicated import here is the same defect in a new place. */
    expect(countOf(publicShell, /<NavBar\b/g)).toBe(1);
    expect(countOf(publicShell, /<Footer\b/g)).toBe(1);
  });
});
