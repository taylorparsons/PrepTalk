import { test, expect } from '@playwright/test';
import { withAccessToken } from './helpers/route.js';

const e2eLiveRaw = (process.env.E2E_LIVE || '').trim().toLowerCase();
const isLive = e2eLiveRaw === '1' || e2eLiveRaw === 'true' || e2eLiveRaw === 'yes';

function buildPdfBuffer(label) {
  const content = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 72 720 Td (${label}) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000111 00000 n \n0000000212 00000 n \ntrailer\n<< /Root 1 0 R /Size 5 >>\nstartxref\n312\n%%EOF\n`;
  return Buffer.from(content, 'utf-8');
}

test('export transcript surfaces API error detail', async ({ page }) => {
  test.skip(isLive, 'Mock-only export error handling test.');

  await page.addInitScript(() => {
    window.__E2E__ = true;
  });

  await page.goto(withAccessToken('/'));

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
  await expect(page.getByTestId('start-interview')).toBeEnabled({ timeout: 30000 });

  await page.evaluate(() => {
    window.__e2eHandleTranscript?.({ role: 'coach', text: 'Hello', timestamp: '00:01' });
  });

  await page.route('**/study-guide?format=pdf', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'text/plain',
      body: 'PDF export unavailable'
    })
  );

  const menuToggle = page.getByTestId('overflow-menu-toggle');
  await menuToggle.click();
  const showExtras = page.getByRole('menuitem', { name: 'Show Extras' });
  await showExtras.click();

  const exportButton = page.getByTestId('export-transcript');
  await expect(exportButton).toBeEnabled();
  await exportButton.click();

  await expect(page.getByTestId('export-help')).toContainText('PDF export unavailable');
});
