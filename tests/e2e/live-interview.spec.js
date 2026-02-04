import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const e2eLiveRaw = (process.env.E2E_LIVE || '').trim().toLowerCase();
const isLive = e2eLiveRaw === '1' || e2eLiveRaw === 'true' || e2eLiveRaw === 'yes';
const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
const liveDurationMs = Number.parseInt(process.env.E2E_LIVE_DURATION_MS || '45000', 10);
const livePollIntervalMs = Number.parseInt(process.env.E2E_LIVE_POLL_MS || '1000', 10);
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

test('candidate interview flow (gemini live)', async ({ page }) => {
  test.skip(!isLive || !hasKey, 'Requires E2E_LIVE=1 and GEMINI_API_KEY or GOOGLE_API_KEY.');
  test.setTimeout(Math.max(120000, liveDurationMs + 60000));

  await page.goto('/');
  const voiceMode = await page.evaluate(() => window.__APP_CONFIG__?.voiceMode || 'live');
  test.skip(voiceMode === 'turn', 'Turn-based voice mode does not run live sessions.');

  const resumeInput = page.getByTestId('resume-file');
  const jobInput = page.getByTestId('job-file');

  if (resumePath && jobPath && fs.existsSync(resumePath) && fs.existsSync(jobPath)) {
    await resumeInput.setInputFiles(resumePath);
    await jobInput.setInputFiles(jobPath);
  } else {
    const resumeBuffer = buildPdfBuffer('Resume');
    const jobBuffer = buildPdfBuffer('Job');

    await resumeInput.setInputFiles({
      name: 'resume.pdf',
      mimeType: 'application/pdf',
      buffer: resumeBuffer
    });

    await jobInput.setInputFiles({
      name: 'job.pdf',
      mimeType: 'application/pdf',
      buffer: jobBuffer
    });
  }

  await page.getByTestId('generate-questions').click();
  await expect(page.getByTestId('start-interview')).toBeEnabled({ timeout: 120000 });

  await page.getByTestId('start-interview').click();
  await expect(page.getByTestId('session-status')).toHaveText('Live', { timeout: 60000 });
  await expect(page.getByTestId('stop-interview')).toBeEnabled();

  const start = Date.now();
  while (Date.now() - start < liveDurationMs) {
    const status = (await page.getByTestId('session-status').innerText()).trim();
    const stopEnabled = await page.getByTestId('stop-interview').isEnabled();
    if (!stopEnabled) {
      throw new Error(`Stop button disabled during live run (status: ${status}).`);
    }
    if (status === 'Live error' || status === 'Live ended' || status === 'Disconnected') {
      throw new Error(`Live session ended early (status: ${status}).`);
    }
    await page.waitForTimeout(livePollIntervalMs);
  }

  await page.getByTestId('stop-interview').click();
  await expect(page.getByTestId('score-value')).not.toHaveText('--');
});
