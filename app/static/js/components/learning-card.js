/**
 * Learning Card Component
 *
 * Displays a resume-grounded example answer BEFORE showing the interview question.
 * Part of the teach-first coaching model to help users know which story to tell.
 *
 * Structure:
 * - Resume fact: The specific experience from the user's resume
 * - Example answer: How to use that fact in an answer
 * - Why this works: Coaching explanation of the approach
 * - CTA: "I'm Ready to Practice" button
 */

import { createButton } from './button.js';

export function createLearningCard(options = {}) {
  const {
    resumeFact = '',
    exampleAnswer = '',
    whyItWorks = '',
    questionPreview = '',
    onReady = null,
    attrs = {}
  } = options;

  const card = document.createElement('article');
  card.className = 'ui-learning-card';
  card.setAttribute('role', 'region');
  card.setAttribute('aria-label', 'Learning example before practice');

  Object.entries(attrs).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    card.setAttribute(key, String(value));
  });

  // Header with coaching intro
  const header = document.createElement('header');
  header.className = 'ui-learning-card__header';

  const eyebrow = document.createElement('div');
  eyebrow.className = 'ui-learning-card__eyebrow';
  eyebrow.textContent = 'Before we practice...';

  const title = document.createElement('h3');
  title.className = 'ui-learning-card__title';
  title.textContent = 'Here\'s an example from your experience';

  header.appendChild(eyebrow);
  header.appendChild(title);
  card.appendChild(header);

  // Question preview (subtle)
  if (questionPreview) {
    const preview = document.createElement('div');
    preview.className = 'ui-learning-card__preview';

    const previewLabel = document.createElement('span');
    previewLabel.className = 'ui-learning-card__label';
    previewLabel.textContent = 'Coming up:';

    const previewText = document.createElement('p');
    previewText.className = 'ui-learning-card__preview-text';
    previewText.textContent = questionPreview.length > 100
      ? questionPreview.substring(0, 100) + '...'
      : questionPreview;

    preview.appendChild(previewLabel);
    preview.appendChild(previewText);
    card.appendChild(preview);
  }

  // Resume fact section
  const factSection = document.createElement('section');
  factSection.className = 'ui-learning-card__section ui-learning-card__section--fact';

  const factLabel = document.createElement('div');
  factLabel.className = 'ui-learning-card__label';
  factLabel.textContent = 'From your resume';

  const factContent = document.createElement('blockquote');
  factContent.className = 'ui-learning-card__blockquote';
  factContent.textContent = resumeFact || 'No specific resume fact available for this question.';

  factSection.appendChild(factLabel);
  factSection.appendChild(factContent);
  card.appendChild(factSection);

  // Example answer section
  const exampleSection = document.createElement('section');
  exampleSection.className = 'ui-learning-card__section ui-learning-card__section--example';

  const exampleLabel = document.createElement('div');
  exampleLabel.className = 'ui-learning-card__label';
  exampleLabel.textContent = 'Example approach';

  const exampleContent = document.createElement('p');
  exampleContent.className = 'ui-learning-card__text';
  exampleContent.textContent = exampleAnswer || 'Use your experience to tell a specific story with clear outcomes.';

  exampleSection.appendChild(exampleLabel);
  exampleSection.appendChild(exampleContent);
  card.appendChild(exampleSection);

  // Why this works section
  const whySection = document.createElement('section');
  whySection.className = 'ui-learning-card__section ui-learning-card__section--why';

  const whyLabel = document.createElement('div');
  whyLabel.className = 'ui-learning-card__label';
  whyLabel.textContent = 'Why this works';

  const whyContent = document.createElement('p');
  whyContent.className = 'ui-learning-card__text ui-learning-card__text--muted';
  whyContent.textContent = whyItWorks || 'Specific examples from your experience are more memorable and credible than generic answers.';

  whySection.appendChild(whyLabel);
  whySection.appendChild(whyContent);
  card.appendChild(whySection);

  // Footer with CTA
  const footer = document.createElement('footer');
  footer.className = 'ui-learning-card__footer';

  const readyButton = createButton({
    label: "I'm Ready to Practice",
    variant: 'primary',
    size: 'lg',
    attrs: {
      'data-testid': 'learning-card-ready'
    },
    onClick: onReady
  });

  footer.appendChild(readyButton);
  card.appendChild(footer);

  return card;
}

/**
 * Generate learning card content from question and resume data
 */
export function generateLearningContent(question, resumeExcerpt, jobExcerpt) {
  const questionText = String(question || '').trim();
  const resume = String(resumeExcerpt || '').trim();

  // Extract keywords from question to find relevant resume lines
  const keywords = extractKeywords(questionText);
  const relevantLines = findRelevantLines(resume, keywords);

  // Build coaching content
  const resumeFact = relevantLines.length > 0
    ? relevantLines[0]
    : 'Review your resume for a specific project or achievement related to this topic.';

  const exampleAnswer = buildExampleApproach(questionText, relevantLines);
  const whyItWorks = buildWhyItWorks(questionText);

  return {
    resumeFact,
    exampleAnswer,
    whyItWorks,
    questionPreview: questionText
  };
}

function extractKeywords(text) {
  const stopwords = new Set([
    'about', 'after', 'and', 'are', 'been', 'can', 'could', 'did', 'for',
    'from', 'have', 'how', 'into', 'just', 'like', 'more', 'most', 'that',
    'the', 'their', 'them', 'then', 'this', 'through', 'was', 'were', 'what',
    'when', 'where', 'which', 'why', 'with', 'would', 'your', 'you', 'tell',
    'describe', 'share', 'give', 'should', 'also', 'any', 'again', 'before'
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopwords.has(word));
}

function findRelevantLines(resume, keywords) {
  if (!resume || keywords.length === 0) return [];

  const lines = resume.split(/\n+/).map(l => l.trim()).filter(l => l.length > 10);

  const scored = lines.map(line => {
    const lower = line.toLowerCase();
    const score = keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
    return { line, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.line);
}

function buildExampleApproach(question, relevantLines) {
  const lower = question.toLowerCase();

  if (lower.includes('tell me about yourself')) {
    return relevantLines.length > 0
      ? `Start with: "I'm a [role] with experience in [area]. For example, ${relevantLines[0].substring(0, 80)}..."`
      : 'Open with your current role, highlight 2-3 relevant experiences, close with why this opportunity excites you.';
  }

  if (/(challenge|difficult|conflict|problem)/.test(lower)) {
    return relevantLines.length > 0
      ? `Use STAR format: Situation from "${relevantLines[0].substring(0, 50)}...", Task you owned, Actions you took, Results you achieved.`
      : 'Structure your answer: Situation, Task, Action, Result. Focus on what YOU did and the measurable outcome.';
  }

  if (/(lead|leadership|manage|team)/.test(lower)) {
    return relevantLines.length > 0
      ? `Describe how you led: "${relevantLines[0].substring(0, 60)}..." Focus on how you aligned people and drove outcomes.`
      : 'Name the team size, your specific role, how you influenced decisions, and the impact on delivery.';
  }

  if (/(technical|design|architecture|system|build)/.test(lower)) {
    return relevantLines.length > 0
      ? `Frame the problem, explain trade-offs: "${relevantLines[0].substring(0, 60)}..." Close with measurable impact.`
      : 'State the problem, explain the constraints, describe your approach and trade-offs, share the outcome.';
  }

  // Generic approach
  return relevantLines.length > 0
    ? `Draw from: "${relevantLines[0].substring(0, 70)}..." Be specific about your role and the outcome.`
    : 'Pick a specific example from your experience. Focus on what you did (not the team) and quantify the result.';
}

function buildWhyItWorks(question) {
  const lower = question.toLowerCase();

  if (lower.includes('tell me about yourself')) {
    return 'This question sets the tone. A clear narrative shows you understand the role and can communicate effectively.';
  }

  if (/(challenge|difficult|conflict)/.test(lower)) {
    return 'Interviewers want to see how you handle adversity. Specific examples show resilience and problem-solving ability.';
  }

  if (/(lead|leadership|manage)/.test(lower)) {
    return 'Leadership questions assess influence and collaboration. Concrete examples prove you can drive outcomes through others.';
  }

  if (/(why|motivation|interest)/.test(lower)) {
    return 'Motivation questions check for genuine interest and fit. Connecting your experience to their needs shows you did your homework.';
  }

  return 'Specific examples from your experience are more memorable and credible than generic answers. Show, don\'t tell.';
}
