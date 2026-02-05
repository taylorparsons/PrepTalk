import { test, expect } from '@playwright/test';

async function gotoPrototype(page) {
  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await page.goto('/prototype-c', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      await page.waitForTimeout(1500 * attempt);
    }
  }
}

test.describe('Prototype C - Console & Network Debug', () => {
  let consoleMessages = [];
  let consoleErrors = [];
  let consoleWarnings = [];
  let networkErrors = [];
  let failedRequests = [];

  test.beforeEach(async ({ page }) => {
    // Reset arrays for each test
    consoleMessages = [];
    consoleErrors = [];
    consoleWarnings = [];
    networkErrors = [];
    failedRequests = [];

    // Listen to all console events
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      const location = msg.location();

      const logEntry = {
        type,
        text,
        url: location.url,
        lineNumber: location.lineNumber,
        columnNumber: location.columnNumber,
      };

      consoleMessages.push(logEntry);

      if (type === 'error') {
        consoleErrors.push(logEntry);
      } else if (type === 'warning') {
        consoleWarnings.push(logEntry);
      }
    });

    // Listen to page errors (uncaught exceptions)
    page.on('pageerror', error => {
      consoleErrors.push({
        type: 'pageerror',
        text: error.message,
        stack: error.stack,
      });
    });

    // Listen to failed requests
    page.on('requestfailed', request => {
      networkErrors.push({
        url: request.url(),
        method: request.method(),
        failure: request.failure()?.errorText || 'Unknown error',
      });
    });

    // Listen to responses to catch 404s and other HTTP errors
    page.on('response', response => {
      const status = response.status();
      const url = response.url();

      // Track failed requests (4xx, 5xx)
      if (status >= 400) {
        failedRequests.push({
          url,
          status,
          statusText: response.statusText(),
          method: response.request().method(),
        });
      }
    });
  });

  test.afterEach(() => {
    // Report all findings after each test
    console.log('\n========== CONSOLE ERRORS ==========');
    if (consoleErrors.length === 0) {
      console.log('✓ No console errors');
    } else {
      consoleErrors.forEach((error, idx) => {
        console.log(`\n[ERROR ${idx + 1}]`);
        console.log(`Type: ${error.type}`);
        console.log(`Message: ${error.text}`);
        if (error.url) console.log(`URL: ${error.url}`);
        if (error.lineNumber) console.log(`Line: ${error.lineNumber}:${error.columnNumber}`);
        if (error.stack) console.log(`Stack: ${error.stack}`);
      });
    }

    console.log('\n========== CONSOLE WARNINGS ==========');
    if (consoleWarnings.length === 0) {
      console.log('✓ No console warnings');
    } else {
      consoleWarnings.forEach((warning, idx) => {
        console.log(`\n[WARNING ${idx + 1}]`);
        console.log(`Message: ${warning.text}`);
        if (warning.url) console.log(`URL: ${warning.url}`);
        if (warning.lineNumber) console.log(`Line: ${warning.lineNumber}:${warning.columnNumber}`);
      });
    }

    console.log('\n========== NETWORK ERRORS ==========');
    if (networkErrors.length === 0) {
      console.log('✓ No network errors');
    } else {
      networkErrors.forEach((error, idx) => {
        console.log(`\n[NETWORK ERROR ${idx + 1}]`);
        console.log(`URL: ${error.url}`);
        console.log(`Method: ${error.method}`);
        console.log(`Failure: ${error.failure}`);
      });
    }

    console.log('\n========== FAILED HTTP REQUESTS ==========');
    if (failedRequests.length === 0) {
      console.log('✓ No failed HTTP requests');
    } else {
      failedRequests.forEach((req, idx) => {
        console.log(`\n[HTTP ERROR ${idx + 1}]`);
        console.log(`URL: ${req.url}`);
        console.log(`Status: ${req.status} ${req.statusText}`);
        console.log(`Method: ${req.method}`);
      });
    }

    console.log('\n========== SUMMARY ==========');
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Console errors: ${consoleErrors.length}`);
    console.log(`Console warnings: ${consoleWarnings.length}`);
    console.log(`Network errors: ${networkErrors.length}`);
    console.log(`Failed HTTP requests: ${failedRequests.length}`);
    console.log('====================================\n');
  });

  test('initial page load and navigation', async ({ page }) => {
    console.log('Navigating to /prototype-c...');

    // Navigate to prototype-c
    await gotoPrototype(page);

    // Wait a bit for any delayed errors
    await page.waitForTimeout(2000);

    console.log('Page loaded, checking DOM state...');

    // Check if critical elements exist
    const bodyExists = await page.locator('body').count();
    console.log(`Body element exists: ${bodyExists > 0}`);

    // Take screenshot of initial state
    await page.screenshot({
      path: 'test-results/prototype-c-initial.png',
      fullPage: true
    });
  });

  test('click My Stories navigation', async ({ page }) => {
    console.log('Testing My Stories navigation...');

    await gotoPrototype(page);

    await page.waitForTimeout(1000);

    // Find and click "My Stories" link
    const myStoriesLink = page.locator('a:has-text("My Stories")').first();
    const linkExists = await myStoriesLink.count();
    console.log(`My Stories link found: ${linkExists > 0}`);

    if (linkExists > 0) {
      console.log('Clicking My Stories...');
      await myStoriesLink.click();

      // Wait for navigation and any errors
      await page.waitForTimeout(2000);

      // Take screenshot after click
      await page.screenshot({
        path: 'test-results/prototype-c-my-stories.png',
        fullPage: true
      });
    } else {
      console.log('WARNING: My Stories link not found!');
    }
  });

  test('test tag filter interactions', async ({ page }) => {
    console.log('Testing tag filter chips...');

    await gotoPrototype(page);

    await page.waitForTimeout(1000);

    // Navigate to My Stories first
    const myStoriesLink = page.locator('a:has-text("My Stories")').first();
    if (await myStoriesLink.count() > 0) {
      await myStoriesLink.click();
      await page.waitForTimeout(1500);
    }

    // Look for tag filter chips (common selectors)
    const chipSelectors = [
      '.chip',
      '.tag-chip',
      '.filter-chip',
      'button[data-tag]',
      '[role="button"][data-filter]',
    ];

    let chipsFound = 0;
    for (const selector of chipSelectors) {
      const chips = page.locator(selector);
      const count = await chips.count();
      if (count > 0) {
        console.log(`Found ${count} chips with selector: ${selector}`);
        chipsFound += count;

        // Click the first few visible chips
        for (let i = 0; i < Math.min(count, 3); i++) {
          const chip = chips.nth(i);
          try {
            await chip.scrollIntoViewIfNeeded({ timeout: 1000 });
          } catch (error) {
            console.log(`Skipping chip ${i + 1}; could not scroll into view.`);
            continue;
          }
          const visible = await chip.isVisible();
          if (!visible) {
            console.log(`Skipping chip ${i + 1}; not visible.`);
            continue;
          }
          console.log(`Clicking chip ${i + 1}...`);
          await chip.click();
          await page.waitForTimeout(500);
        }
      }
    }

    if (chipsFound === 0) {
      console.log('WARNING: No tag filter chips found!');
    }

    await page.screenshot({
      path: 'test-results/prototype-c-filters.png',
      fullPage: true
    });
  });

  test('test progress ring hover interactions', async ({ page }) => {
    console.log('Testing progress ring hovers...');

    await gotoPrototype(page);

    await page.waitForTimeout(1000);

    // Look for progress ring elements (common selectors)
    const progressSelectors = [
      '.progress-ring',
      '.circular-progress',
      'svg.progress',
      '[data-progress]',
      'circle[data-progress]',
    ];

    let ringsFound = 0;
    for (const selector of progressSelectors) {
      const rings = page.locator(selector);
      const count = await rings.count();
      if (count > 0) {
        console.log(`Found ${count} progress rings with selector: ${selector}`);
        ringsFound += count;

        // Hover over the first few rings
        for (let i = 0; i < Math.min(count, 3); i++) {
          console.log(`Hovering over ring ${i + 1}...`);
          await rings.nth(i).hover();
          await page.waitForTimeout(500);
        }
      }
    }

    if (ringsFound === 0) {
      console.log('WARNING: No progress rings found!');
    }

    await page.screenshot({
      path: 'test-results/prototype-c-progress.png',
      fullPage: true
    });
  });

  test('comprehensive interaction test', async ({ page }) => {
    console.log('Running comprehensive interaction test...');

    await gotoPrototype(page);

    await page.waitForTimeout(2000);

    // Try clicking various elements
    const interactiveSelectors = [
      'button',
      'a[href]',
      '[role="button"]',
      'input',
      'select',
    ];

    for (const selector of interactiveSelectors) {
      const elements = page.locator(selector).first();
      const exists = await elements.count();
      if (exists > 0) {
        const tag = selector.split('[')[0];
        console.log(`Found ${tag} element, attempting interaction...`);

        try {
          if (tag === 'button' || selector.includes('role="button"')) {
            await elements.click({ timeout: 1000 });
          } else if (tag === 'a') {
            // Just hover, don't navigate away
            await elements.hover({ timeout: 1000 });
          } else if (tag === 'input') {
            await elements.focus({ timeout: 1000 });
          }
          await page.waitForTimeout(500);
        } catch (e) {
          console.log(`Could not interact with ${tag}: ${e.message}`);
        }
      }
    }

    await page.screenshot({
      path: 'test-results/prototype-c-comprehensive.png',
      fullPage: true
    });
  });
});
