import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const mdPath = 'docs/Client-Demo-Walkthrough.md';
const tempHtmlBody = 'docs/handover-pdf-source/temp-body.html';
const finalHtml = 'docs/handover-pdf-source/client-demo-walkthrough.html';
const pdfPath = 'docs/Client-Demo-Walkthrough.pdf';

try {
  console.log('Converting Markdown to HTML body...');
  execSync(`npx -y marked -i ${mdPath} --gfm -o ${tempHtmlBody}`);

  const bodyContent = fs.readFileSync(tempHtmlBody, 'utf8');

  // Read the common stylesheet to match branding
  const cssContent = fs.readFileSync('docs/handover-pdf-source/client-brand-pdf.css', 'utf8');

  // Build the complete styled HTML document
  const fullHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Save Philly Festivals - Core Features Client Demo Guide</title>
  <style>
    ${cssContent}
    .hero {
      border: 1px solid var(--line);
      border-radius: 16px;
      background: radial-gradient(circle at 85% 15%, #ffe6cf 0%, #fff8f1 28%, #ffffff 65%);
      padding: 22px;
      margin-bottom: 24px;
    }
    .brand-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px dashed var(--line);
    }
    .brand-row img {
      width: 270px;
      max-width: 70%;
      height: auto;
    }
    .doc-chip {
      border: 1px solid #efc9aa;
      background: #fff7ef;
      color: #804016;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-radius: 999px;
      padding: 6px 10px;
      white-space: nowrap;
    }
    .meta { color: var(--muted); font-size: 13px; margin: 4px 0; }
    .tag {
      display: inline-block;
      margin-top: 6px;
      margin-right: 6px;
      padding: 5px 10px;
      border-radius: 999px;
      background: var(--brand-soft);
      color: #803401;
      font-size: 12px;
      font-weight: 700;
    }
    /* Hide the duplicated main header from markdown since it's in the hero */
    .content h1:first-child {
      display: none;
    }
  </style>
</head>
<body>
  <main class="wrap" style="padding: 24px;">
    <section class="hero">
      <div class="brand-row">
        <img src="SPF%20One%20Line%20Logo.png" alt="Save Philly Festivals logo" />
        <span class="doc-chip">Demo Guide</span>
      </div>
      <h1 style="font-family: 'Merriweather', Georgia, serif; font-size: 28px; color: #1a2d4a; margin: 0 0 10px;">Save Philly Festivals<br/>Core Features Client Demo Guide</h1>
      <p class="meta">Purpose: step-by-step walkthrough script and dashboard demonstration guide</p>
      <p class="meta">Scope: public discovery, schedule exports, and secure admin interfaces</p>
      <span class="tag">Walkthrough Script</span>
      <span class="tag">Platform Demo</span>
      <span class="tag">Operations</span>
    </section>

    <div class="content">
      ${bodyContent}
    </div>
  </main>
</body>
</html>`;

  fs.writeFileSync(finalHtml, fullHtml, 'utf8');
  console.log(`Saved HTML wrapper to ${finalHtml}`);

  console.log('Generating PDF using Headless Chrome...');
  execSync(`google-chrome --headless --disable-gpu --no-sandbox --print-to-pdf="${pdfPath}" ${finalHtml}`);
  console.log(`Successfully generated PDF at ${pdfPath}`);

  // Clean up temp file
  fs.unlinkSync(tempHtmlBody);
} catch (err) {
  console.error('Error generating PDF:', err);
  process.exit(1);
}
