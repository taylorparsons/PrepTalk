import { test, expect } from '@playwright/test';

test.describe('Learning Card Component Validation', () => {
  test('validates Learning Card component structure exists', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify Learning Card CSS classes exist in components.css
    const hasLearningCardStyles = await page.evaluate(() => {
      const styles = Array.from(document.styleSheets)
        .filter(sheet => {
          try {
            return sheet.cssRules && sheet.href && sheet.href.includes('components.css');
          } catch {
            return false;
          }
        })
        .flatMap(sheet => Array.from(sheet.cssRules))
        .some(rule => rule.cssText && rule.cssText.includes('.ui-learning-card'));
      return styles;
    });

    expect(hasLearningCardStyles).toBe(true);
  });

  test('validates Learning Card component factory function', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Import and test the component in browser context
    const cardStructure = await page.evaluate(async () => {
      const module = await import('/static/js/components/learning-card.js');
      const card = module.createLearningCard({
        resumeFact: 'Led a team of 5 engineers to deliver cloud migration project',
        exampleAnswer: 'Use STAR format to describe the situation and your leadership role',
        whyItWorks: 'Specific examples show your actual experience and impact',
        questionPreview: 'Tell me about a time you led a challenging project',
        onReady: null
      });

      return {
        tagName: card.tagName,
        className: card.className,
        role: card.getAttribute('role'),
        ariaLabel: card.getAttribute('aria-label'),
        hasHeader: !!card.querySelector('.ui-learning-card__header'),
        hasPreview: !!card.querySelector('.ui-learning-card__preview'),
        hasFactSection: !!card.querySelector('.ui-learning-card__section--fact'),
        hasExampleSection: !!card.querySelector('.ui-learning-card__section--example'),
        hasWhySection: !!card.querySelector('.ui-learning-card__section--why'),
        hasFooter: !!card.querySelector('.ui-learning-card__footer'),
        hasReadyButton: !!card.querySelector('[data-testid="learning-card-ready"]')
      };
    });

    // Validate component structure
    expect(cardStructure.tagName).toBe('ARTICLE');
    expect(cardStructure.className).toBe('ui-learning-card');
    expect(cardStructure.role).toBe('region');
    expect(cardStructure.ariaLabel).toBe('Learning example before practice');
    expect(cardStructure.hasHeader).toBe(true);
    expect(cardStructure.hasPreview).toBe(true);
    expect(cardStructure.hasFactSection).toBe(true);
    expect(cardStructure.hasExampleSection).toBe(true);
    expect(cardStructure.hasWhySection).toBe(true);
    expect(cardStructure.hasFooter).toBe(true);
    expect(cardStructure.hasReadyButton).toBe(true);
  });

  test('validates generateLearningContent helper function', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const content = await page.evaluate(async () => {
      const module = await import('/static/js/components/learning-card.js');

      const question = 'Tell me about a time you faced a difficult challenge';
      const resume = `Software Engineer at TechCorp
Led migration of legacy system to cloud infrastructure
Reduced deployment time by 60% through CI/CD automation
Managed team of 5 engineers across 3 time zones`;

      return module.generateLearningContent(question, resume);
    });

    // Validate content generation
    expect(content.questionPreview).toContain('challenge');
    expect(content.resumeFact).toBeTruthy();
    expect(content.exampleAnswer).toBeTruthy();
    expect(content.whyItWorks).toBeTruthy();

    // Should detect challenge keyword and provide STAR format guidance
    expect(content.exampleAnswer.toLowerCase()).toMatch(/star|situation/);
  });

  test('validates Learning Mode toggle exists in UI', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for Learning Mode toggle button
    const toggleButton = page.locator('[data-testid="learning-mode-toggle"]');
    const toggleExists = await toggleButton.count();

    // Log result for audit
    console.log(`Learning Mode toggle: ${toggleExists > 0 ? 'FOUND' : 'NOT FOUND'}`);

    // Toggle should exist
    expect(toggleExists).toBeGreaterThan(0);
  });

  test('validates Learning Card accessibility', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const a11yResults = await page.evaluate(async () => {
      const module = await import('/static/js/components/learning-card.js');
      const card = module.createLearningCard({
        resumeFact: 'Test resume fact',
        exampleAnswer: 'Test example',
        whyItWorks: 'Test why',
        questionPreview: 'Test question'
      });

      // Check accessibility attributes
      const results = {
        hasRole: card.hasAttribute('role'),
        roleValue: card.getAttribute('role'),
        hasAriaLabel: card.hasAttribute('aria-label'),
        headings: card.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
        sections: card.querySelectorAll('section').length,
        hasFooter: !!card.querySelector('footer'),
        hasHeader: !!card.querySelector('header'),
        buttonHasLabel: !!card.querySelector('button[data-testid="learning-card-ready"]')
      };

      return results;
    });

    // Accessibility checks
    expect(a11yResults.hasRole).toBe(true);
    expect(a11yResults.roleValue).toBe('region');
    expect(a11yResults.hasAriaLabel).toBe(true);
    expect(a11yResults.headings).toBeGreaterThan(0);
    expect(a11yResults.sections).toBe(3); // fact, example, why
    expect(a11yResults.hasFooter).toBe(true);
    expect(a11yResults.hasHeader).toBe(true);
    expect(a11yResults.buttonHasLabel).toBe(true);
  });
});
