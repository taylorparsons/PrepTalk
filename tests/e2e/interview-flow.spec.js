import { test, expect } from '@playwright/test';

const isLive = Boolean(process.env.E2E_LIVE);

function buildPdfBuffer(label) {
  const content = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 72 720 Td (${label}) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000111 00000 n \n0000000212 00000 n \ntrailer\n<< /Root 1 0 R /Size 5 >>\nstartxref\n312\n%%EOF\n`;
  return Buffer.from(content, 'utf-8');
}

test('candidate interview flow (mock adapter)', async ({ page }) => {
  test.skip(isLive, 'Skip mock flow when running live adapter.');
  await page.goto('/');

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

  await expect(page.locator('.ui-caption__label')).toHaveText('Live captions (local, en-US)');
  await expect(page.locator('.ui-caption__text')).toHaveText('Captions idle.');

  await page.getByTestId('generate-questions').click();
  await expect(page.getByTestId('question-list')).toContainText('Walk me through');
  await expect(page.getByTestId('start-interview')).toBeEnabled();

  await page.getByTestId('start-interview').click();
  await expect(page.getByTestId('transcript-list')).toContainText('Welcome');

  await page.getByTestId('stop-interview').click();
  await expect(page.getByTestId('score-value')).toHaveText('84');
  await expect(page.getByTestId('score-summary')).toContainText('Clear structure');
});
