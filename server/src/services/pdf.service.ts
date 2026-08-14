import puppeteer from 'puppeteer';

/**
 * Wraps raw document body content in the exact HTML/CSS template compiler used by the frontend.
 */
export function wrapDocument(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Residential Rental Agreement</title>
<style>
/* Reset */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* Grey workspace canvas — the iframe fills the editor container width.
   html provides the grey background with vertical breathing room.
   The white .page floats centred on it, like paper on a desk. */
html {
  background: #c8c8c8;
  padding: 24px 0;
  font-family: 'Times New Roman', Times, serif;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
body { background: transparent; margin: 0; padding: 0; }

/* White A4 page
   max-width 816px (210mm standard A4 proportional width).
   width 100%.
   Balanced professional legal document margins: 20mm (~48px) top/bottom, 22mm (~54px) left/right. */
.page {
  max-width: 816px;
  width: 100%;
  min-height: 1056px;
  margin: 0 auto;
  padding: 48px 54px;
  background: #ffffff;
  color: #000000;
  font-family: 'Times New Roman', Times, serif;
  font-size: 13.5pt;
  line-height: 1.45;
  box-shadow: 0 2px 18px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.08);
}

/* ═══ Stamp space ══════════════════════════════════════════════════════════ */
.stamp-space {
  margin-top: 0;
  margin-bottom: 24pt;
  text-align: center;
  page-break-inside: avoid;
  break-inside: avoid;
}
.stamp-paper-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin: 0 auto;
}
.stamp-paper-img {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  aspect-ratio: 763 / 321;
  object-fit: contain;
  margin: 0 auto;
  border-radius: 4px;
  border: 1px solid #c8d0d8;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.stamp-paper-caption {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2pt;
  margin-top: 6pt;
  font-family: 'Times New Roman', Times, serif;
}
.stamp-badge {
  font-size: 8.5pt;
  font-weight: bold;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #333333;
}
.stamp-note {
  font-size: 8pt;
  font-style: italic;
  color: #666666;
  text-align: center;
}

/* ═══ Title ════════════════════════════════════════════════════════════════ */
.doc-title {
  font-size: 17pt;
  font-weight: bold;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: normal;
  margin-bottom: 20pt;
  margin-top: 6pt;
}

/* ═══ Preamble ═════════════════════════════════════════════════════════════ */
.preamble-this {
  margin-bottom: 12pt;
  text-align: justify;
  text-justify: inter-word;
  line-height: 1.45;
}
.preamble-between {
  margin-bottom: 5pt;
}
.party-name {
  font-weight: bold;
  font-size: 13.5pt;
  text-align: center;
  margin: 6pt 0 2pt 0;
}
.party-role {
  text-align: center;
  margin-bottom: 2pt;
  font-size: 13pt;
}
.party-sep {
  text-align: center;
  font-weight: bold;
  letter-spacing: normal;
  margin: 8pt 0;
  font-size: 12pt;
}
.consideration {
  margin: 14pt 0 12pt 0;
  text-align: justify;
  text-justify: inter-word;
  line-height: 1.45;
}

/* Section headings — always keep with next clause (orphan prevention) */
.section-heading {
  font-size: 13pt;
  font-weight: bold;
  text-decoration: underline;
  margin-top: 14pt;
  margin-bottom: 5pt;
  page-break-after: avoid;
  break-after: avoid-page;
  page-break-inside: avoid;
  break-inside: avoid;
}

/* Body text 12pt, monetary/date bold via .val class */
/* Clauses pair with their heading via page-break-inside avoid on first clause */
.clause {
  display: flex;
  align-items: flex-start;
  margin-bottom: 5pt;
}
.cnum {
  flex: 0 0 24pt;
  font-size: 12pt;
  line-height: 1.5;
  padding-right: 4pt;
  font-weight: normal;
}
.cbody {
  flex: 1;
  font-size: 12pt;
  line-height: 1.5;
  text-align: justify;
  text-justify: inter-word;
}
/* Bold only monetary amounts & dates for consistency */
.val {
  font-weight: bold;
}

/* ═══ Lettered subclauses ══════════════════════════════════════════════════ */
.subclause {
  display: flex;
  align-items: flex-start;
  margin-left: 24pt;
  margin-bottom: 3pt;
}
.scnum {
  flex: 0 0 18pt;
  font-size: 11.5pt;
  line-height: 1.5;
  padding-right: 4pt;
}
.scbody {
  flex: 1;
  font-size: 11.5pt;
  line-height: 1.5;
  text-align: justify;
  text-justify: inter-word;
}

/* ═══ Continuation text ════════════════════════════════════════════════════ */
.continuation {
  font-size: 12pt;
  margin-left: 24pt;
  margin-bottom: 5pt;
  text-align: justify;
  text-justify: inter-word;
}

/* ═══ Execution block — no stray line before IN WITNESS WHEREOF ═══ */
.execution {
  margin-top: 28pt;
  padding-top: 14pt;
  border-top: 2px solid #000;
  page-break-inside: avoid;
  break-inside: avoid;
}
.exec-heading {
  margin-bottom: 20pt;
  text-align: justify;
  text-justify: inter-word;
  font-size: 12pt;
  line-height: 1.5;
}
.sig-row {
  display: flex;
  gap: 36pt;
  margin-bottom: 4pt;
}
.sig-col {
  flex: 1;
}
.sig-line {
  border-top: 1px solid #000;
  margin-top: 30pt;
  margin-bottom: 5pt;
}
.sig-name {
  font-weight: bold;
  font-size: 12pt;
  margin-bottom: 2pt;
}
.sig-role {
  font-size: 11pt;
  margin-bottom: 1pt;
}
.witness-block {
  margin-top: 26pt;
  page-break-inside: avoid;
  break-inside: avoid;
}
.witness-label {
  font-size: 12pt;
  font-weight: bold;
  margin-bottom: 6pt;
}

.page-footer {
  display: none;
}

/* ─── Print / PDF — match screen preview exactly ──────────────────────────── */
@media print {
  html {
    background: #ffffff !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  body {
    background: #ffffff !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  /* Keep .page sizing exactly as on screen — only remove shadow + auto-margin */
  .page {
    max-width: 100% !important;
    width: 100% !important;
    min-height: auto !important;
    margin: 0 !important;
    padding: 48px 54px !important;
    box-shadow: none !important;
    background: #ffffff !important;
  }
  /* Remove grey canvas background so the page bleeds white to edge */
  html, body, .page {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  /* Page X of Y via @page counter (supported in Chrome/Edge print-to-PDF) */
  @page {
    size: A4 portrait;
    margin: 0;
    @bottom-right {
      content: 'Page ' counter(page) ' of ' counter(pages);
      font-family: 'Times New Roman', Times, serif;
      font-size: 9pt;
      color: #444;
      margin-right: 54px;
      margin-bottom: 14px;
    }
  }
}
</style>
</head>
<body>
<div class="page">
${body}
</div>
</body>
</html>`;
}

/**
 * Returns either raw wrapper HTML or the full document.
 */
export function compileHtml(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith('<!DOCTYPE html>') || trimmed.startsWith('<html')) {
    return trimmed;
  }
  return wrapDocument(content);
}

/**
 * Compiles document content to PDF using headless Chrome/Chromium printing.
 */
export async function generatePdfFromHtml(htmlContent: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  try {
    const page = await browser.newPage();
    
    // Set viewport A4 ratio to prevent layout stretching
    await page.setViewport({ width: 816, height: 1056 });

    // Set A4 HTML content
    const compiledHtml = compileHtml(htmlContent);
    await page.setContent(compiledHtml, { waitUntil: 'load' });
    
    // Export to A4 PDF matching browser settings
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      }
    });
    
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
