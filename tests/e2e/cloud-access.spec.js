import { test, expect } from '@playwright/test';

const accessToken = (process.env.E2E_ACCESS_TOKEN || '').trim();

test('cloud endpoint requires token on root', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/PrepTalk Access/i);
  await expect(page.getByRole('heading', { name: /Access Required/i })).toBeVisible();
});

test('cloud endpoint opens app with access token', async ({ page }) => {
  test.skip(!accessToken, 'Requires E2E_ACCESS_TOKEN');
  await page.goto(`/?access_token=${encodeURIComponent(accessToken)}`);
  await expect(page).toHaveTitle(/PrepTalk Practice Coach/i);
  await expect(page.getByTestId('generate-questions')).toBeVisible();
});
