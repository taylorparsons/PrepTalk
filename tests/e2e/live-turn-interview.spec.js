import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const e2eLiveRaw = (process.env.E2E_LIVE || '').trim().toLowerCase();
const isLive = e2eLiveRaw === '1' || e2eLiveRaw === 'true' || e2eLiveRaw === 'yes';
const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
const resumePath = process.env.E2E_RESUME_PATH;
const jobPath = process.env.E2E_JOB_PATH;

function buildPdfBuffer(label) {
  const content = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 12 Tf 72 720 Td (${label}) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000111 00000 n 
0000000212 00000 n 
trailer
<< /Root 1 0 R /Size 5 >>
startxref
312
%%EOF
`;
  return Buffer.from(content, 'utf-8');
}

async function captureStep(page, testInfo, name) {
  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach(name, { body: screenshot, contentType: 'image/png' });
}

test('candidate interview flow (gemini turn voice)', async ({ page }, testInfo) => {
  test.skip(!isLive || !hasKey, 'Requires E2E_LIVE=1 and GEMINI_API_KEY or GOOGLE_API_KEY.');
  test.setTimeout(120000);

  await page.addInitScript(() => {
    window.__E2E__ = true;
  });

  await page.goto('/');
  const voiceMode = await page.evaluate(() => window.__APP_CONFIG__?.voiceMode || 'live');
  test.skip(voiceMode !== 'turn', 'Requires VOICE_MODE=turn for turn-based voice.');

  await captureStep(page, testInfo, 'state-1-setup-empty');

  const resumeFileInput = page.getByTestId('resume-file');
  const jobFileInput = page.getByTestId('job-file');

  if (resumePath && jobPath && fs.existsSync(resumePath) && fs.existsSync(jobPath)) {
    await resumeFileInput.setInputFiles(resumePath);
    await jobFileInput.setInputFiles(jobPath);
  } else {
    const resumeBuffer = buildPdfBuffer('Resume');
    const jobBuffer = buildPdfBuffer('Job');

    await resumeFileInput.setInputFiles({
      name: 'resume.pdf',
      mimeType: 'application/pdf',
      buffer: resumeBuffer
    });

    await jobFileInput.setInputFiles({
      name: 'job.pdf',
      mimeType: 'application/pdf',
      buffer: jobBuffer
    });
  }

  await captureStep(page, testInfo, 'state-2-ready-to-generate');

  const generateButton = page.getByTestId('generate-questions');
  const startButton = page.getByTestId('start-interview');
  const setupPanel = page.getByTestId('setup-panel');
  const questionsPanel = page.getByTestId('questions-panel');
  const insightsPanel = page.getByTestId('question-insights-panel');
  const controlsPanel = page.getByTestId('controls-panel');
  const transcriptPanel = page.getByTestId('transcript-panel');
  const scorePanel = page.getByTestId('score-panel');

  await expect(generateButton).toHaveClass(/ui-button--primary/);
  await expect(startButton).toHaveClass(/ui-button--secondary/);
  await expect(page.getByTestId('session-tools-toggle')).toHaveText('Extras');
  await expect(questionsPanel).toBeHidden();
  await expect(insightsPanel).toBeHidden();
  await expect(controlsPanel).toBeHidden();
  await expect(transcriptPanel).toBeHidden();
  await expect(scorePanel).toBeHidden();

  await generateButton.click();
  await expect(page.getByTestId('generate-progress')).toBeVisible({ timeout: 10000 });
  await captureStep(page, testInfo, 'state-3-generating');
  await expect(startButton).toBeEnabled({
    timeout: isLive ? 120000 : 10000
  });
  await expect(generateButton).toHaveClass(/ui-button--secondary/);
  await expect(startButton).toHaveClass(/ui-button--primary/);
  await expect(questionsPanel).toBeVisible();
  await expect(insightsPanel).toBeVisible();
  await expect(controlsPanel).toBeVisible();
  await expect(transcriptPanel).toBeHidden();
  await expect(scorePanel).toBeHidden();
  await expect(setupPanel).toHaveClass(/ui-panel--collapsed/);
  await captureStep(page, testInfo, 'state-4-questions-ready');

  await startButton.click();
  await expect(page.getByTestId('session-status')).toHaveText(/Welcoming|Listening/);
  await expect(page.getByTestId('session-status')).toHaveText('Listening', { timeout: 60000 });
  await expect(setupPanel).toHaveClass(/ui-panel--collapsed/);
  const resumeInput = page.getByTestId('resume-file');
  await expect(resumeInput).toBeHidden();
  const menuToggle = page.getByTestId('overflow-menu-toggle');
  await expect(menuToggle).toBeVisible();
  await menuToggle.click();
  const candidateMenuItem = page.getByRole('menuitem', { name: 'Candidate Setup' });
  await expect(candidateMenuItem).toBeVisible();
  await candidateMenuItem.click();
  await expect(resumeInput).toBeVisible();
  const setupToggle = page.getByTestId('setup-collapse');
  await expect(setupToggle).toBeEnabled();
  await setupToggle.click();
  await expect(resumeInput).toBeHidden();
  await setupToggle.click();
  await expect(resumeInput).toBeVisible();

  const helpTurn = page.getByTestId('help-turn');
  const submitTurn = page.getByTestId('submit-turn');
  const turnHelp = page.getByTestId('turn-help');
  await expect(helpTurn).toBeEnabled({ timeout: 20000 });
  await expect(submitTurn).toBeDisabled();
  await expect(turnHelp).toContainText(/Need a nudge/i, { timeout: 20000 });
  await helpTurn.click();
  await expect(page.getByTestId('turn-rubric')).toBeVisible();
  await captureStep(page, testInfo, 'state-5-interview-turn');

  await page.waitForFunction(() => Boolean(window.__e2eQueueTurn));
  await page.evaluate(() => window.__e2eQueueTurn?.('Hello from the e2e test.'));

  await expect(page.getByTestId('transcript-list')).toContainText('Hello from the e2e test.', {
    timeout: 20000
  });
  await expect(transcriptPanel).toBeVisible();
  await expect.poll(
    () => page.locator('.ui-transcript__row--coach').count(),
    { timeout: 60000 }
  ).toBeGreaterThan(0);

  await page.getByTestId('start-interview').click();
  await expect(scorePanel).toBeVisible();
  await expect(controlsPanel).toBeVisible();
  await expect(controlsPanel).toHaveClass(/ui-controls--results/);
  await expect(questionsPanel).toBeHidden();
  await expect(insightsPanel).toBeHidden();
  await expect(transcriptPanel).toBeHidden();
  await expect(page.getByTestId('score-value')).not.toHaveText('--', {
    timeout: isLive ? 60000 : 10000
  });
  await expect(page.getByTestId('restart-interview-main')).toBeEnabled();
  await expect(page.getByTestId('restart-interview-main')).toHaveClass(/ui-button--primary/);
  const exportPdfMain = page.getByTestId('export-pdf-main');
  const exportTxtMain = page.getByTestId('export-txt-main');
  await expect(exportPdfMain).toBeEnabled();
  await expect(exportTxtMain).toBeEnabled();
  const [pdfDownload] = await Promise.all([
    page.waitForEvent('download'),
    exportPdfMain.click()
  ]);
  expect(await pdfDownload.suggestedFilename()).toMatch(/\.pdf$/i);
  const [txtDownload] = await Promise.all([
    page.waitForEvent('download'),
    exportTxtMain.click()
  ]);
  expect(await txtDownload.suggestedFilename()).toMatch(/\.txt$/i);
  await captureStep(page, testInfo, 'state-6-scoring-results');
});
