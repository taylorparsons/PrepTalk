import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.DEMO_BASE_URL || 'https://preptalk-west-test-cz47ti6tbq-uw.a.run.app';
const ACCESS_TOKEN = process.env.DEMO_ACCESS_TOKEN || 'preptalk-test';
const OUTPUT_DIR = process.env.DEMO_IMAGE_DIR || 'demo-slide-images';

const CANDIDATE_TEXT = 'I led a cross-functional launch across product, design, and engineering, cut delivery risk by clarifying ownership, and shipped on time with measurable adoption gains.';

function buildPdfBuffer(label) {
  const content = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 72 720 Td (${label}) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000111 00000 n \n0000000212 00000 n \ntrailer\n<< /Root 1 0 R /Size 5 >>\nstartxref\n312\n%%EOF\n`;
  return Buffer.from(content, 'utf-8');
}

async function saveShot(page, filename, locator = null) {
  const fullPath = path.join(OUTPUT_DIR, filename);
  if (locator) {
    await locator.screenshot({ path: fullPath });
  } else {
    await page.screenshot({ path: fullPath, fullPage: false });
  }
  return fullPath;
}

async function prepareDesktopApp(page) {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.addInitScript(() => {
    window.__E2E__ = true;
  });
  const route = `${BASE_URL}/?access_token=${encodeURIComponent(ACCESS_TOKEN)}`;
  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="generate-questions"]');
}

async function uploadDocs(page) {
  await page.getByTestId('resume-file').setInputFiles({
    name: 'resume.pdf',
    mimeType: 'application/pdf',
    buffer: buildPdfBuffer('Resume')
  });
  await page.getByTestId('job-file').setInputFiles({
    name: 'job.pdf',
    mimeType: 'application/pdf',
    buffer: buildPdfBuffer('Job')
  });
}

async function ensureQuestions(page) {
  await page.getByTestId('generate-questions').click();
  await page.waitForSelector('[data-testid="controls-panel"]', { timeout: 30000 });
  await page.waitForSelector('[data-testid="question-list"]', { timeout: 30000 });
}

async function appendTranscriptEntry(page, entry) {
  await page.evaluate((payload) => {
    window.__e2eHandleTranscript?.(payload);
  }, entry);
}

async function enableTurnActions(page) {
  await page.evaluate(() => {
    const state = window.__e2eState || {};
    const ui = window.__e2eUi || {};
    state.sessionActive = true;
    state.sessionStarted = true;
    state.turnAwaitingAnswer = true;
    state.turnSpeaking = false;
    state.captionDraftText = '';
    ui.updateTurnSubmitUI?.();
    ui.updateSessionToolsState?.();
  });
}

async function invokeHelp(page) {
  const interviewId = await page.evaluate(() => window.__e2eState?.interviewId || '');
  const question = await page.evaluate(() => {
    const state = window.__e2eState || {};
    return state.questions?.[0] || 'Tell me about yourself';
  });
  if (!interviewId) return null;

  const url = `${BASE_URL}/api/voice/help?access_token=${encodeURIComponent(ACCESS_TOKEN)}`;
  const response = await page.request.post(url, {
    data: {
      interview_id: interviewId,
      question,
      answer: CANDIDATE_TEXT
    }
  });
  if (response.status() !== 200) {
    return null;
  }
  const payload = await response.json();
  if (payload?.help) {
    await appendTranscriptEntry(page, payload.help);
    return payload.help;
  }
  return null;
}

async function scoreSession(page) {
  await page.evaluate(() => {
    const state = window.__e2eState || {};
    const ui = window.__e2eUi || {};
    state.sessionActive = true;
    state.sessionStarted = true;
    ui.updateTurnSubmitUI?.();
    ui.updateSessionToolsState?.();
  });

  await page.getByTestId('start-interview').click();
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="score-value"]');
    return el && el.textContent && !el.textContent.includes('--');
  }, { timeout: 60000 });
}

async function captureRollbackSlide(page) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body{font-family:Arial,sans-serif;background:#f7f8fa;padding:40px;color:#1f2937}
  h1{margin:0 0 16px;font-size:34px}
  p{font-size:18px;margin:0 0 18px}
  pre{background:#111827;color:#f9fafb;padding:20px;border-radius:12px;font-size:16px;line-height:1.4;white-space:pre-wrap}
  </style></head><body>
  <h1>Rollback Readiness</h1>
  <p>Release rollback command for last known-good revision:</p>
  <pre>gcloud run services update-traffic preptalk-west-test \\
  --region us-west1 \\
  --platform managed \\
  --to-revisions preptalk-west-test-00021-kwv=100</pre>
  </body></html>`;
  const htmlPath = path.join(OUTPUT_DIR, 'rollback-ready.html');
  await fs.writeFile(htmlPath, html, 'utf-8');
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`file://${htmlPath}`);
  await saveShot(page, 'slide14_rollback_readiness.png');
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  const desktopContext = await browser.newContext();
  const page = await desktopContext.newPage();

  // Slide 04: secure access view (no token)
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await saveShot(page, 'slide04_secure_access.png');

  // Main app flow for desktop screenshots
  await prepareDesktopApp(page);
  await saveShot(page, 'slide01_intro.png');
  await saveShot(page, 'slide02_opening_release_flow.png');

  await uploadDocs(page);
  await saveShot(page, 'slide05_candidate_setup.png');

  await ensureQuestions(page);
  await saveShot(page, 'slide03_overview_flow.png');
  await saveShot(page, 'slide06_session_start.png');
  await saveShot(page, 'slide07_core_controls.png', page.getByTestId('controls-panel'));
  await saveShot(page, 'slide11_insights_view.png', page.getByTestId('question-insights-panel'));

  await enableTurnActions(page);
  await invokeHelp(page);
  await page.waitForTimeout(1200);
  await saveShot(page, 'slide08_request_help.png');

  const now = new Date().toISOString();
  await appendTranscriptEntry(page, { role: 'candidate', text: CANDIDATE_TEXT, timestamp: now });
  await appendTranscriptEntry(page, { role: 'coach', text: 'Great structure. Tighten with one quantified impact and role alignment.', timestamp: now });
  await page.waitForTimeout(500);
  await saveShot(page, 'slide09_candidate_answer.png');

  await scoreSession(page);
  await saveShot(page, 'slide10_scoring.png');
  await saveShot(page, 'slide12_exports.png', page.getByTestId('score-panel'));
  await saveShot(page, 'slide15_close.png');

  // Mobile screenshot
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobile = await mobileContext.newPage();
  await mobile.addInitScript(() => {
    window.__E2E__ = true;
  });
  await mobile.goto(`${BASE_URL}/?access_token=${encodeURIComponent(ACCESS_TOKEN)}`, { waitUntil: 'networkidle' });
  await mobile.waitForSelector('[data-testid="generate-questions"]');
  await mobile.getByTestId('resume-file').setInputFiles({ name: 'resume.pdf', mimeType: 'application/pdf', buffer: buildPdfBuffer('Mobile Resume') });
  await mobile.getByTestId('job-file').setInputFiles({ name: 'job.pdf', mimeType: 'application/pdf', buffer: buildPdfBuffer('Mobile Job') });
  await mobile.getByTestId('generate-questions').click();
  await mobile.waitForSelector('[data-testid="controls-panel"]', { timeout: 30000 });
  await saveShot(mobile, 'slide13_mobile_view.png');

  await captureRollbackSlide(page);

  await mobileContext.close();
  await desktopContext.close();
  await browser.close();

  const files = await fs.readdir(OUTPUT_DIR);
  for (const name of files.filter((f) => f.endsWith('.png')).sort()) {
    console.log(path.join(OUTPUT_DIR, name));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
