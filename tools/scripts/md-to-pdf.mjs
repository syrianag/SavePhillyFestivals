/**
 * Render a Markdown document to a print-ready PDF.
 *
 * Used for the client-facing guides in `docs/`. Headless Chrome does the pagination because it
 * is already on the machine and understands `@page`, page breaks, and web fonts — no Pandoc or
 * LaTeX toolchain to install and keep working.
 *
 * Images are inlined as data URIs rather than linked, so the PDF renders identically wherever
 * it is opened and does not depend on the repository being present.
 *
 * Usage:
 *   node tools/scripts/md-to-pdf.mjs docs/Client-UserGuide.md docs/Client-UserGuide.pdf
 */
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, extname } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { marked } from "marked";

const run = promisify(execFile);

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/snap/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

function findChrome() {
  const found = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!found) throw new Error(`No Chrome/Chromium binary found. Tried: ${CHROME_CANDIDATES.join(", ")}`);
  return found;
}

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml" };

/** Inlines local images so the PDF is self-contained. */
async function inlineImages(html, baseDir) {
  const matches = [...html.matchAll(/<img([^>]*?)src="([^"]+)"([^>]*?)>/g)];
  let output = html;
  for (const [full, before, src, after] of matches) {
    if (/^(https?:|data:)/.test(src)) continue;
    const filePath = resolve(baseDir, decodeURIComponent(src));
    if (!existsSync(filePath)) {
      console.warn(`  ! image not found, leaving as-is: ${src}`);
      continue;
    }
    const data = await readFile(filePath);
    const mime = MIME[extname(filePath).toLowerCase()] || "application/octet-stream";
    output = output.replace(full, `<img${before}src="data:${mime};base64,${data.toString("base64")}"${after}>`);
  }
  return output;
}

const STYLES = `
  @page { size: Letter; margin: 18mm 16mm 20mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 10.5pt; line-height: 1.55; color: #1e293b; margin: 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  h1 { font-size: 24pt; color: #0f172a; margin: 0 0 4pt; letter-spacing: -0.4pt; }
  h2 {
    font-size: 15pt; color: #0f172a; margin: 22pt 0 8pt; padding-bottom: 4pt;
    border-bottom: 1.5pt solid #1e7bf6; break-after: avoid;
  }
  h3 { font-size: 12pt; color: #1e293b; margin: 16pt 0 6pt; break-after: avoid; }
  h4 { font-size: 10.5pt; color: #334155; margin: 12pt 0 4pt; break-after: avoid; }
  p, li { orphans: 3; widows: 3; }
  a { color: #1d4ed8; text-decoration: none; }
  code {
    font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: 9pt;
    background: #f1f5f9; padding: 1pt 3pt; border-radius: 3px; color: #0f172a;
  }
  pre {
    background: #f8fafc; border: 0.5pt solid #e2e8f0; border-left: 3pt solid #94a3b8;
    padding: 8pt 10pt; border-radius: 4px; font-size: 9pt; overflow-x: auto; break-inside: avoid;
  }
  pre code { background: none; padding: 0; }
  table {
    width: 100%; border-collapse: collapse; margin: 10pt 0; font-size: 9.5pt;
    break-inside: auto;
  }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  th {
    background: #f1f5f9; text-align: left; font-weight: 700; color: #0f172a;
    padding: 6pt 8pt; border: 0.5pt solid #cbd5e1;
  }
  td { padding: 6pt 8pt; border: 0.5pt solid #e2e8f0; vertical-align: top; }
  tbody tr:nth-child(even) { background: #fafcff; }
  blockquote {
    margin: 12pt 0; padding: 10pt 14pt; background: #eff6ff;
    border-left: 3pt solid #1e7bf6; border-radius: 0 4px 4px 0; break-inside: avoid;
  }
  blockquote > :first-child { margin-top: 0; }
  blockquote > :last-child { margin-bottom: 0; }
  blockquote h3 { margin-top: 0; color: #1e40af; }
  hr { border: none; border-top: 0.5pt solid #e2e8f0; margin: 18pt 0; }
  img { max-width: 58mm; height: auto; margin: 6pt 0 10pt; }
  ul, ol { padding-left: 18pt; }
  li { margin: 3pt 0; }
  strong { color: #0f172a; }
`;

async function main() {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) {
    console.error("Usage: node tools/scripts/md-to-pdf.mjs <input.md> <output.pdf>");
    process.exitCode = 1;
    return;
  }

  const inputPath = resolve(input);
  const markdown = await readFile(inputPath, "utf8");
  const title = markdown.match(/^#\s+(.+)$/m)?.[1] ?? "Document";

  marked.setOptions({ gfm: true, breaks: false });
  const body = await inlineImages(marked.parse(markdown), dirname(inputPath));

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${title.replace(/[<>&]/g, "")}</title><style>${STYLES}</style></head>
<body>${body}</body></html>`;

  const workDir = await mkdtemp(join(tmpdir(), "md-to-pdf-"));
  const htmlPath = join(workDir, "document.html");
  await writeFile(htmlPath, html, "utf8");

  const chrome = findChrome();
  console.log(`Rendering with ${chrome}`);

  try {
    await run(chrome, [
      "--headless",
      "--disable-gpu",
      "--no-sandbox",
      "--no-pdf-header-footer",
      `--print-to-pdf=${resolve(output)}`,
      `file://${htmlPath}`,
    ], { timeout: 120_000 });
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }

  const { size } = await import("node:fs").then((fs) => fs.promises.stat(resolve(output)));
  console.log(`Wrote ${output} (${Math.round(size / 1024)} KB)`);
}

main().catch((error) => {
  console.error(`md-to-pdf failed: ${error.message}`);
  process.exitCode = 1;
});
