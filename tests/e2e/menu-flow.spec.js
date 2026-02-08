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

async function setupInterview(page) {
  const route = accessToken ? `/?access_token=${encodeURIComponent(accessToken)}` : '/';
  await page.goto(route);
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

async function assertMenuOverlaysControls(page) {
  const layering = await page.evaluate(() => {
    const menuList = document.querySelector('.ui-overflow-menu__list');
    const controlsPanel = document.querySelector('[data-testid="controls-panel"]');
    if (!menuList || !controlsPanel) {
      return { ok: false, reason: 'missing_nodes' };
    }
    const menuZ = Number.parseInt(getComputedStyle(menuList).zIndex || '0', 10) || 0;
    const controlsZ = Number.parseInt(getComputedStyle(controlsPanel).zIndex || '0', 10) || 0;
    const rect = menuList.getBoundingClientRect();
    const x = Math.max(1, Math.min(window.innerWidth - 2, rect.left + Math.min(rect.width / 2, 24)));
    const y = Math.max(1, Math.min(window.innerHeight - 2, rect.top + Math.min(rect.height / 2, 24)));
    const top = document.elementFromPoint(x, y);
    const topInMenu = Boolean(top && (top === menuList || menuList.contains(top)));
    return {
      ok: menuZ > controlsZ && topInMenu,
      menuZ,
      controlsZ,
      topInMenu,
      topNode: top ? `${top.tagName}.${top.className || ''}` : 'null'
    };
  });
  expect(layering.ok, JSON.stringify(layering)).toBe(true);
}

async function assertExtrasOverlaysControls(page) {
  const layering = await page.evaluate(() => {
    const drawer = document.querySelector('[data-testid="session-tools-drawer"]');
    const backdrop = document.querySelector('[data-testid="session-tools-backdrop"]');
    const controlsPanel = document.querySelector('[data-testid="controls-panel"]');
    if (!drawer || !backdrop || !controlsPanel) {
      return { ok: false, reason: 'missing_nodes' };
    }
    const drawerZ = Number.parseInt(getComputedStyle(drawer).zIndex || '0', 10) || 0;
    const backdropZ = Number.parseInt(getComputedStyle(backdrop).zIndex || '0', 10) || 0;
    const controlsZ = Number.parseInt(getComputedStyle(controlsPanel).zIndex || '0', 10) || 0;
    const rect = drawer.getBoundingClientRect();
    return {
      ok: drawerZ > controlsZ && backdropZ > controlsZ && drawerZ > backdropZ && rect.width > 0 && rect.height > 0,
      drawerZ,
      backdropZ,
      controlsZ,
      drawerWidth: Math.round(rect.width),
      drawerHeight: Math.round(rect.height)
    };
  });
  expect(layering.ok, JSON.stringify(layering)).toBe(true);
}

test.describe.configure({ mode: 'serial' });

for (const scenario of scenarios) {
  test(`overflow menu behavior (${scenario.name})`, async ({ page }) => {
    test.skip(isLive, 'Menu behavior spec is for mock adapter mode.');
    test.setTimeout(120000);
    await page.setViewportSize(scenario.viewport);
    await page.addInitScript(() => {
      window.__E2E__ = true;
    });

    await setupInterview(page);

    const menuToggle = page.getByTestId('overflow-menu-toggle');
    const menuList = page.locator('.ui-overflow-menu__list').first();
    const setupPanel = page.getByTestId('setup-panel');
    const controlsPanel = page.getByTestId('controls-panel');

    await expect(controlsPanel).toBeHidden();
    await expect(menuList).toBeHidden();

    await page.getByTestId('generate-questions').click();
    await expect(controlsPanel).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('question-list')).toBeVisible({ timeout: 30000 });

    await menuToggle.click();
    await expect(menuList).toBeVisible();
    await assertMenuOverlaysControls(page);
    const hideCandidate = page.getByRole('menuitem', { name: 'Hide Candidate Setup' });
    await expect(hideCandidate).toBeVisible();
    await hideCandidate.click();
    await expect(menuList).toBeHidden();
    await expect(setupPanel).toBeHidden();

    await menuToggle.click();
    await expect(menuList).toBeVisible();
    const showCandidate = page.getByRole('menuitem', { name: 'Show Candidate Setup' });
    await expect(showCandidate).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Hide Candidate Setup' })).toHaveCount(0);
    await showCandidate.click();
    await expect(setupPanel).toBeVisible();
    await expect(menuList).toBeHidden();

    await menuToggle.click();
    await expect(menuList).toBeVisible();
    const showExtras = page.getByRole('menuitem', { name: 'Show Extras' });
    await expect(showExtras).toBeVisible();
    await showExtras.click();
    const drawer = page.getByTestId('session-tools-drawer');
    const backdrop = page.getByTestId('session-tools-backdrop');
    await expect(drawer).toBeVisible();
    await expect(backdrop).toBeVisible();
    await assertExtrasOverlaysControls(page);
    await page.getByTestId('session-tools-close').click();
    await expect(drawer).toHaveAttribute('aria-hidden', 'true');
    await expect(backdrop).toHaveAttribute('aria-hidden', 'true');
  });
}
