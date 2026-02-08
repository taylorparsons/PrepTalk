import { test, expect } from '@playwright/test';

const e2eLiveRaw = (process.env.E2E_LIVE || '').trim().toLowerCase();
const isLive = e2eLiveRaw === '1' || e2eLiveRaw === 'true' || e2eLiveRaw === 'yes';
const accessToken = (process.env.E2E_ACCESS_TOKEN || '').trim();

const scenarios = [
  { name: 'desktop', viewport: { width: 1366, height: 900 } },
  { name: 'mobile', viewport: { width: 390, height: 844 } }
];

function buildPdfBuffer(label) {
  const content = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 72 720 Td (${label}) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000111 00000 n \n0000000212 00000 n \ntrailer\n<< /Root 1 0 R /Size 5 >>\nstartxref\n312\n%%EOF\n`;
  return Buffer.from(content, 'utf-8');
}

async function attachStep(page, testInfo, label) {
  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach(label, { body: screenshot, contentType: 'image/png' });
}

async function setupInterview(page, scenarioName) {
  const route = accessToken ? `/?access_token=${encodeURIComponent(accessToken)}` : '/';
  await page.goto(route);
  await page.getByTestId('resume-file').setInputFiles({
    name: `${scenarioName}-resume.pdf`,
    mimeType: 'application/pdf',
    buffer: buildPdfBuffer(`${scenarioName}-Resume`)
  });
  await page.getByTestId('job-file').setInputFiles({
    name: `${scenarioName}-job.pdf`,
    mimeType: 'application/pdf',
    buffer: buildPdfBuffer(`${scenarioName}-Job`)
  });
  await page.getByTestId('generate-questions').click();
  await expect(page.getByTestId('question-list')).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('controls-panel')).toBeVisible({ timeout: 15000 });
}

async function assertMenuToggle(page) {
  const menuToggle = page.getByTestId('overflow-menu-toggle');
  const menuList = page.locator('.ui-overflow-menu__list').first();
  const setupPanel = page.getByTestId('setup-panel');

  await expect(menuList).toBeHidden();
  await menuToggle.click();
  await expect(menuList).toBeVisible();

  const hideCandidate = page.getByRole('menuitem', { name: 'Hide Candidate Setup' });
  await expect(hideCandidate).toBeVisible();
  await hideCandidate.click();
  await expect(setupPanel).toBeHidden();
  await expect(menuList).toBeHidden();

  await menuToggle.click();
  const showCandidate = page.getByRole('menuitem', { name: 'Show Candidate Setup' });
  await expect(showCandidate).toBeVisible();
  await showCandidate.click();
  await expect(setupPanel).toBeVisible();
}

async function assertPageScroll(page) {
  const before = await page.evaluate(() => {
    const root = document.scrollingElement;
    if (!root) return { top: 0, max: 0 };
    return {
      top: root.scrollTop,
      max: Math.max(0, root.scrollHeight - root.clientHeight)
    };
  });
  expect(before.max).toBeGreaterThan(0);

  await page.evaluate(() => {
    const root = document.scrollingElement;
    if (!root) return;
    root.scrollTo({ top: root.scrollHeight, behavior: 'auto' });
  });
  await page.waitForTimeout(250);

  const after = await page.evaluate(() => {
    const root = document.scrollingElement;
    if (!root) return { top: 0 };
    return { top: root.scrollTop };
  });
  expect(after.top).toBeGreaterThan(0);
}

for (const scenario of scenarios) {
  test(`menu + page scroll works (${scenario.name})`, async ({ page }, testInfo) => {
    test.skip(isLive, 'Menu/scroll validation runs in mock mode.');
    test.setTimeout(120000);

    await page.setViewportSize(scenario.viewport);
    await page.addInitScript(() => {
      window.__E2E__ = true;
    });

    await setupInterview(page, scenario.name);
    await attachStep(page, testInfo, `${scenario.name}-ready`);

    await assertMenuToggle(page);
    await attachStep(page, testInfo, `${scenario.name}-menu-toggle`);

    await assertPageScroll(page);
    await attachStep(page, testInfo, `${scenario.name}-scrolled`);
  });
}
