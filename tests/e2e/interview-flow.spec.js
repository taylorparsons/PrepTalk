import { test, expect } from '@playwright/test';

const e2eLiveRaw = (process.env.E2E_LIVE || '').trim().toLowerCase();
const isLive = e2eLiveRaw === '1' || e2eLiveRaw === 'true' || e2eLiveRaw === 'yes';
test.setTimeout(120000);

function buildPdfBuffer(label) {
  const content = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 72 720 Td (${label}) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000111 00000 n \n0000000212 00000 n \ntrailer\n<< /Root 1 0 R /Size 5 >>\nstartxref\n312\n%%EOF\n`;
  return Buffer.from(content, 'utf-8');
}

async function captureStep(page, testInfo, name) {
  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach(name, { body: screenshot, contentType: 'image/png' });
}

test('candidate interview flow (mock adapter)', async ({ page }, testInfo) => {
  test.skip(isLive, 'Skip mock flow when running live adapter.');
  await page.addInitScript(() => {
    window.__E2E__ = true;
  });
  await page.goto('/');
  const voiceMode = await page.evaluate(() => window.__APP_CONFIG__?.voiceMode || 'live');

  await captureStep(page, testInfo, 'state-1-setup-empty');

  const resumeBuffer = buildPdfBuffer('Resume');
  const jobBuffer = buildPdfBuffer('Job');

  await page.getByTestId('resume-file').setInputFiles({
    name: 'resume.pdf',
    mimeType: 'application/pdf',
    buffer: resumeBuffer
  });

  await page.getByTestId('job-file').setInputFiles({
    name: 'job.pdf',
    mimeType: 'application/pdf',
    buffer: jobBuffer
  });

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
  await expect(questionsPanel).toBeHidden();
  await expect(insightsPanel).toBeHidden();
  await expect(controlsPanel).toBeVisible();
  await expect(transcriptPanel).toBeHidden();
  await expect(scorePanel).toBeHidden();

  await generateButton.click();
  await expect(page.getByTestId('generate-progress')).toBeVisible({ timeout: 10000 });
  await captureStep(page, testInfo, 'state-3-generating');
  await expect(startButton).toBeEnabled({ timeout: 30000 });
  await expect(questionsPanel).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('question-list')).toContainText(/walk me through/i);
  await expect(generateButton).toHaveClass(/ui-button--secondary/);
  await expect(startButton).toHaveClass(/ui-button--primary/);
  await expect(questionsPanel).toBeVisible();
  await expect(insightsPanel).toBeVisible();
  await expect(controlsPanel).toBeVisible();
  await expect(transcriptPanel).toBeHidden();
  await expect(scorePanel).toBeHidden();
  await captureStep(page, testInfo, 'state-4-questions-ready');

  await startButton.click();
  if (voiceMode === 'turn') {
    await expect(page.getByTestId('session-status')).toHaveText(/Welcoming|Listening/);
  } else {
    await expect(page.getByTestId('session-status')).toHaveText(/Live|Listening|Welcoming/);
  }
  const menuToggle = page.getByTestId('overflow-menu-toggle');
  await expect(menuToggle).toBeVisible();
  await menuToggle.click();
  const hideCandidate = page.getByRole('menuitem', { name: 'Hide Candidate Setup' });
  await expect(hideCandidate).toBeVisible();
  await hideCandidate.click();
  await expect(setupPanel).toBeHidden();
  await menuToggle.click();
  const showCandidate = page.getByRole('menuitem', { name: 'Show Candidate Setup' });
  await expect(showCandidate).toBeVisible();
  await showCandidate.click();
  await expect(setupPanel).toBeVisible();
  const helpTurn = page.getByTestId('help-turn');
  const submitTurn = page.getByTestId('submit-turn');
  if (voiceMode === 'turn') {
    await page.evaluate(() => {
      const state = window.__e2eState;
      const ui = window.__e2eUi;
      state.sessionActive = true;
      state.turnAwaitingAnswer = true;
      state.turnSpeaking = true;
      state.captionDraftText = 'Draft answer';
      ui.updateTurnSubmitUI();
    });

    const interrupt = page.getByTestId('barge-in-toggle');
    await expect(interrupt).toBeEnabled();
    await expect(submitTurn).toBeDisabled();
    await interrupt.click();
    await expect(interrupt).toBeDisabled();
    await expect(submitTurn).toBeEnabled();
  }
  const statusDetail = page.getByTestId('status-detail');
  await expect(helpTurn).toBeEnabled({ timeout: 20000 });
  await expect(submitTurn).toBeDisabled();
  await expect(statusDetail).toContainText(/Need a nudge/i, { timeout: 20000 });
  await helpTurn.click();
  const turnRubric = page.getByTestId('turn-rubric');
  if (await turnRubric.isHidden()) {
    await page.getByTestId('rubric-toggle').click();
  }
  await expect(turnRubric).toBeVisible();
  await captureStep(page, testInfo, 'state-5-interview-turn');

  await page.getByTestId('start-interview').click();
  await expect(scorePanel).toBeVisible();
  await expect(controlsPanel).toBeVisible();
  await expect(controlsPanel).toHaveClass(/ui-controls--results/);
  await expect(questionsPanel).toBeHidden();
  await expect(insightsPanel).toBeHidden();
  await expect(transcriptPanel).toBeHidden();
  const restartMain = page.getByTestId('restart-interview-main');
  await expect(restartMain).toBeEnabled();
  await expect(page.getByTestId('session-status')).toHaveText(/Complete/, { timeout: 30000 });
  await expect(restartMain).toHaveClass(/ui-button--primary/);
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
