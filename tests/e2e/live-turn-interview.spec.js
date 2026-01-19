import { test, expect } from '@playwright/test';

const isLive = Boolean(process.env.E2E_LIVE);
const hasKey = Boolean(process.env.GEMINI_API_KEY);

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

test('candidate interview flow (gemini turn voice)', async ({ page }) => {
  test.skip(!isLive || !hasKey, 'Requires E2E_LIVE=1 and GEMINI_API_KEY.');
  test.setTimeout(120000);

  await page.addInitScript(() => {
    window.__E2E__ = true;
  });

  await page.goto('/');
  const voiceMode = await page.evaluate(() => window.__APP_CONFIG__?.voiceMode || 'live');
  test.skip(voiceMode !== 'turn', 'Requires VOICE_MODE=turn for turn-based voice.');

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

  await page.getByTestId('generate-questions').click();
  await expect(page.getByTestId('start-interview')).toBeEnabled();

  await page.getByTestId('start-interview').click();
  await expect(page.getByTestId('session-status')).toHaveText('Listening');

  await page.waitForFunction(() => Boolean(window.__e2eQueueTurn));
  await page.evaluate(() => window.__e2eQueueTurn?.('Hello from the e2e test.'));

  await expect(page.getByTestId('transcript-list')).toContainText('Hello from the e2e test.');
  await expect.poll(
    () => page.locator('.ui-transcript__row--coach').count(),
    { timeout: 60000 }
  ).toBeGreaterThan(0);

  await page.getByTestId('stop-interview').click();
  await expect(page.getByTestId('score-value')).not.toHaveText('--');
});
