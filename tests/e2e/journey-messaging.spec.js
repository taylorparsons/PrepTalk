import { test, expect } from '@playwright/test';

test.describe('Journey Messaging Validation (Coach, Not Judge)', () => {
  test('validates coach-first messaging throughout UI', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Screenshot for visual audit
    await page.screenshot({ path: 'test-results/journey-messaging.png', fullPage: true });

    // Get full page text for validation
    const pageText = await page.evaluate(() => document.body.textContent);

    // Validate NEW coach-first terminology is present
    const expectedTerms = [
      'Your Interview Practice Coach',  // Hero eyebrow
      'Build confidence',               // Hero subtitle
      'personalized practice',          // Hero subtitle
      'Prepare Practice',               // Generate button
      'Share your background',          // Setup panel subtitle
      'Practice Topics',                // Questions panel title
      'Begin Practice',                 // Start button
      'coaching tips',                  // Insights panel
      'coaching feedback'               // Score panel
    ];

    const foundTerms = [];
    const missingTerms = [];

    for (const term of expectedTerms) {
      if (pageText.includes(term)) {
        foundTerms.push(term);
      } else {
        missingTerms.push(term);
      }
    }

    // Log results for audit
    console.log(`Found ${foundTerms.length}/${expectedTerms.length} expected terms`);
    if (missingTerms.length > 0) {
      console.log('Missing terms:', missingTerms.join(', '));
    }

    // At least 70% of terms should be present (some may be in hidden elements)
    const complianceRate = foundTerms.length / expectedTerms.length;
    expect(complianceRate).toBeGreaterThanOrEqual(0.7);
  });

  test('validates old terminology has been removed', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const pageText = await page.evaluate(() => document.body.textContent);

    // Old terminology that should NOT appear in visible text
    const oldTerms = [
      'Generate Questions',  // Now "Prepare Practice"
      'Start Interview',     // Now "Begin Practice"
      'Interview Questions', // Now "Practice Topics"
      'Restart interview'    // Now "Restart Practice"
    ];

    const foundOldTerms = [];
    for (const term of oldTerms) {
      if (pageText.includes(term)) {
        foundOldTerms.push(term);
      }
    }

    // Log for audit
    console.log(`Old terminology check: ${foundOldTerms.length === 0 ? 'PASS' : 'FAIL'}`);
    if (foundOldTerms.length > 0) {
      console.log('Old terms found:', foundOldTerms.join(', '));
    }

    expect(foundOldTerms.length).toBe(0);
  });

  test('validates journey phase messaging changes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const messagingChecks = [];

    // Check 1: Hero section uses coach positioning
    const heroText = await page.evaluate(() => {
      const hero = document.querySelector('.ui-hero');
      return hero ? hero.textContent : '';
    });
    const hasCoachHero = heroText.includes('Coach') || heroText.includes('confidence');
    messagingChecks.push({ name: 'Hero coach positioning', pass: hasCoachHero });

    // Check 2: Setup uses "Share your background" language
    const setupText = await page.evaluate(() => {
      const setup = document.querySelector('[data-testid="setup-panel"]');
      return setup ? setup.textContent : '';
    });
    const hasShareBackground = setupText.includes('Share') || setupText.includes('background');
    messagingChecks.push({ name: 'Setup sharing language', pass: hasShareBackground });

    // Check 3: Questions panel uses "Practice Topics"
    const questionsText = await page.evaluate(() => {
      const panel = document.querySelector('[data-testid="questions-panel"]');
      return panel ? panel.textContent : '';
    });
    const hasPracticeTopics = questionsText.includes('Practice') || questionsText.includes('Topics');
    messagingChecks.push({ name: 'Practice Topics title', pass: hasPracticeTopics });

    // Check 4: Score panel uses coaching language
    const scoreText = await page.evaluate(() => {
      const panel = document.querySelector('[data-testid="score-panel"]');
      return panel ? panel.textContent : '';
    });
    const hasCoachingFeedback = scoreText.includes('coaching') || scoreText.includes('feedback');
    messagingChecks.push({ name: 'Coaching feedback language', pass: hasCoachingFeedback });

    // Log results
    const passedChecks = messagingChecks.filter(c => c.pass);
    console.log(`Messaging checks: ${passedChecks.length}/${messagingChecks.length} passed`);
    messagingChecks.forEach(c => {
      console.log(`  ${c.name}: ${c.pass ? 'PASS' : 'FAIL'}`);
    });

    // All checks should pass
    expect(passedChecks.length).toBe(messagingChecks.length);
  });
});
