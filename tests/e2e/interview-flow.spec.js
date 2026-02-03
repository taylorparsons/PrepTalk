import { test, expect } from '@playwright/test';

const isLive = Boolean(process.env.E2E_LIVE);

function buildPdfBuffer(label) {
  const content = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 72 720 Td (${label}) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000111 00000 n \n0000000212 00000 n \ntrailer\n<< /Root 1 0 R /Size 5 >>\nstartxref\n312\n%%EOF\n`;
  return Buffer.from(content, 'utf-8');
}

test('candidate interview flow (mock adapter)', async ({ page }) => {
  test.skip(isLive, 'Skip mock flow when running live adapter.');
  await page.goto('/');
  const voiceMode = await page.evaluate(() => window.__APP_CONFIG__?.voiceMode || 'live');

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

  await startButton.click();
  const introText = "Hi, I'm your interview coach. Let's get started. Tell me about yourself.";
  if (voiceMode === 'turn') {
    await expect(page.getByTestId('session-status')).toHaveText('Listening');
    await expect(page.getByTestId('transcript-list')).toContainText(introText);
  } else {
    await expect(page.getByTestId('transcript-list')).toContainText(introText);
  }
  await expect(setupPanel).toHaveClass(/ui-panel--collapsed/);
  const resumeInput = page.getByTestId('resume-file');
  await expect(resumeInput).toBeHidden();
  const setupToggle = page.getByTestId('setup-collapse');
  await expect(setupToggle).toBeEnabled();
  await setupToggle.click();
  await expect(setupPanel).not.toHaveClass(/ui-panel--collapsed/);
  await expect(resumeInput).toBeVisible();
  await setupToggle.click();
  await expect(setupPanel).toHaveClass(/ui-panel--collapsed/);
  await expect(resumeInput).toBeHidden();
  await expect(transcriptPanel).toBeVisible();
  const helpTurn = page.getByTestId('help-turn');
  const submitTurn = page.getByTestId('submit-turn');
  const turnHelp = page.getByTestId('turn-help');
  await expect(helpTurn).toBeEnabled({ timeout: 20000 });
  await expect(submitTurn).toBeDisabled();
  await expect(turnHelp).toContainText(/Need a nudge/i, { timeout: 20000 });
  await helpTurn.click();
  await expect(page.getByTestId('turn-rubric')).toBeVisible();

  await page.getByTestId('stop-interview').click();
  await expect(scorePanel).toBeVisible();
  await expect(controlsPanel).toBeHidden();
  await expect(questionsPanel).toBeHidden();
  await expect(insightsPanel).toBeHidden();
  await expect(transcriptPanel).toBeHidden();
  await expect(page.getByTestId('score-value')).toHaveText('84');
  await expect(page.getByTestId('score-summary')).toContainText('Clear structure');
  await expect(page.getByTestId('restart-interview-main')).toBeEnabled();
  await expect(page.getByTestId('restart-interview-main')).toHaveClass(/ui-button--primary/);
  await expect(page.getByTestId('export-pdf-main')).toBeEnabled();
  await expect(page.getByTestId('export-txt-main')).toBeEnabled();
});
