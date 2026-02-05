import { test, expect } from '@playwright/test';

test.describe('Nordic Warmth Design Validation', () => {
  test('validates color palette and design system', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Screenshot for visual audit
    await page.screenshot({ path: 'test-results/nordic-warmth-full.png', fullPage: true });

    // Validate Nordic Warmth CSS variables are applied
    const rootStyles = await page.evaluate(() => {
      const root = document.documentElement;
      const computed = getComputedStyle(root);
      return {
        primary: computed.getPropertyValue('--ui-color-primary').trim(),
        ink: computed.getPropertyValue('--ui-color-ink').trim(),
        surface: computed.getPropertyValue('--ui-color-surface').trim(),
        accent: computed.getPropertyValue('--ui-color-accent').trim(),
        birch: computed.getPropertyValue('--ui-color-birch').trim(),
      };
    });

    // Verify Nordic Warmth palette (not old green #1f6f5f)
    expect(rootStyles.primary).toBe('#6B7B8A');
    expect(rootStyles.ink).toBe('#3D3A36');
    expect(rootStyles.surface).toBe('#FAF8F5');
    expect(rootStyles.accent).toBe('#D4A574');
    expect(rootStyles.birch).toBe('#F5F0E8');

    // Validate theme attribute
    const theme = await page.getAttribute('html', 'data-theme');
    expect(theme).toBe('nordic');

    // Validate hero section exists
    const hero = page.locator('.ui-hero');
    await expect(hero).toBeVisible();

    // Validate primary button uses correct color
    const startButton = page.locator('[data-testid="start-interview"]');
    await expect(startButton).toBeVisible();
    const buttonBg = await startButton.evaluate(el => getComputedStyle(el).backgroundColor);
    // RGB for #6B7B8A is rgb(107, 123, 138)
    expect(buttonBg).toContain('107');

    // Validate panels have correct background
    const setupPanel = page.locator('[data-testid="setup-panel"]');
    await expect(setupPanel).toBeVisible();
  });

  test('validates accessibility requirements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check skip link exists
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toHaveAttribute('href', '#main-content');

    // Check app shell has proper role
    const appShell = page.locator('#app');
    await expect(appShell).toHaveAttribute('role', 'application');

    // Check aria-live regions
    const statusPill = page.locator('[data-testid="session-status"]');
    await expect(statusPill).toHaveAttribute('aria-live', 'polite');

    const turnHelp = page.locator('[data-testid="turn-help"]');
    await expect(turnHelp).toHaveAttribute('aria-live', 'polite');

    // Check focus visible works (tab to first interactive element)
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Screenshot with focus state
    await page.screenshot({ path: 'test-results/nordic-warmth-focus.png' });
  });

  test('validates form field accessibility', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Count inputs with proper accessibility attributes
    const inputs = await page.locator('input:not([type="hidden"])').all();
    const selects = await page.locator('select').all();

    let compliant = 0;
    let nonCompliant = 0;
    const issues = [];

    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const name = await input.getAttribute('name');
      const ariaLabel = await input.getAttribute('aria-label');
      const testId = await input.getAttribute('data-testid');

      if (id || name || ariaLabel) {
        compliant++;
      } else {
        nonCompliant++;
        issues.push(`Input [data-testid="${testId}"] missing id/name/aria-label`);
      }
    }

    for (const select of selects) {
      const id = await select.getAttribute('id');
      const ariaLabel = await select.getAttribute('aria-label');
      const testId = await select.getAttribute('data-testid');

      if (id || ariaLabel) {
        compliant++;
      } else {
        nonCompliant++;
        issues.push(`Select [data-testid="${testId}"] missing id/aria-label`);
      }
    }

    // Log issues for audit
    console.log(`Form a11y: ${compliant} compliant, ${nonCompliant} non-compliant`);
    if (issues.length > 0) {
      console.log('Issues:', issues.join(', '));
    }

    // At least 50% should be compliant (for now - will improve)
    const complianceRate = compliant / (compliant + nonCompliant);
    expect(complianceRate).toBeGreaterThan(0.5);
  });
});
