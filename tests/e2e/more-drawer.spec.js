import { test, expect } from '@playwright/test';

const isLive = Boolean(process.env.E2E_LIVE);

function buildPdfBuffer(label) {
  const content = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 72 720 Td (${label}) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000111 00000 n \n0000000212 00000 n \ntrailer\n<< /Root 1 0 R /Size 5 >>\nstartxref\n312\n%%EOF\n`;
  return Buffer.from(content, 'utf-8');
}

test('more drawer is scrollable on small viewports', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
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

  await page.getByTestId('generate-questions').click();
  await expect(page.getByTestId('start-interview')).toBeEnabled({
    timeout: isLive ? 30000 : 10000
  });

  const sessionToolsToggle = page.getByTestId('session-tools-toggle');
  await expect(sessionToolsToggle).toBeVisible();
  await sessionToolsToggle.click();

  const drawer = page.getByTestId('session-tools-drawer');
  await expect(drawer).toHaveAttribute('aria-hidden', 'false');
  await expect(page.getByTestId('session-tools-close')).toBeVisible();

  await drawer.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(drawer).toContainText('Export transcript');
});
