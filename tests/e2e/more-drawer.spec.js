import { test, expect } from '@playwright/test';

test('more drawer is scrollable on small viewports', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');

  await page.getByTestId('session-tools-toggle').click();
  const drawer = page.getByTestId('session-tools-drawer');
  await expect(drawer).toHaveAttribute('aria-hidden', 'false');
  await expect(page.getByTestId('session-tools-close')).toBeVisible();

  await drawer.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(drawer).toContainText('Export transcript');
});

