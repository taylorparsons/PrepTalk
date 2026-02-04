import { describe, it, expect, vi } from 'vitest';
import { createLearningCard, generateLearningContent } from '../../app/static/js/components/learning-card.js';

describe('createLearningCard', () => {
  it('creates a learning card with all sections', () => {
    const card = createLearningCard({
      resumeFact: 'Led a team of 5 engineers',
      exampleAnswer: 'Start with the team context...',
      whyItWorks: 'Shows leadership ability',
      questionPreview: 'Tell me about a time you led a team'
    });

    expect(card.classList.contains('ui-learning-card')).toBe(true);
    expect(card.getAttribute('role')).toBe('region');
    expect(card.textContent).toContain('Led a team of 5 engineers');
    expect(card.textContent).toContain('Start with the team context');
    expect(card.textContent).toContain('Shows leadership ability');
  });

  it('calls onReady when button is clicked', () => {
    const onReady = vi.fn();
    const card = createLearningCard({ onReady });

    const button = card.querySelector('[data-testid="learning-card-ready"]');
    expect(button).not.toBeNull();
    button.click();
    expect(onReady).toHaveBeenCalledOnce();
  });

  it('shows default content when props are empty', () => {
    const card = createLearningCard({});

    expect(card.textContent).toContain('No specific resume fact');
    expect(card.textContent).toContain('Specific examples from your experience');
  });
});

describe('generateLearningContent', () => {
  it('extracts relevant lines from resume', () => {
    const question = 'Tell me about a time you led a technical project';
    const resume = `
      Led technical architecture for cloud migration project
      Managed team of 8 engineers across 3 time zones
      Delivered platform serving 10M daily users
    `;

    const content = generateLearningContent(question, resume, '');

    expect(content.questionPreview).toBe(question);
    expect(content.resumeFact).toContain('technical');
  });

  it('provides coaching for leadership questions', () => {
    const question = 'Describe your leadership style';
    const content = generateLearningContent(question, '', '');

    expect(content.whyItWorks).toContain('Leadership');
  });

  it('provides coaching for challenge questions', () => {
    const question = 'Tell me about a difficult challenge you faced';
    const content = generateLearningContent(question, '', '');

    expect(content.whyItWorks).toContain('adversity');
  });

  it('handles empty inputs gracefully', () => {
    const content = generateLearningContent('', '', '');

    expect(content.resumeFact).toBeDefined();
    expect(content.exampleAnswer).toBeDefined();
    expect(content.whyItWorks).toBeDefined();
  });
});
