import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildVoiceLayout } from '../../app/static/js/ui.js';
import { scoreInterview } from '../../app/static/js/api/client.js';

vi.mock('../../app/static/js/api/client.js', () => ({
  addCustomQuestion: vi.fn(),
  createInterview: vi.fn(),
  downloadStudyGuide: vi.fn(),
  getInterviewSummary: vi.fn(),
  getLogSummary: vi.fn().mockResolvedValue({}),
  listSessions: vi.fn(),
  logClientEvent: vi.fn(),
  restartInterview: vi.fn(),
  scoreInterview: vi.fn(),
  sendVoiceFeedback: vi.fn(),
  sendVoiceIntro: vi.fn(),
  sendVoiceTurnCompletion: vi.fn(),
  sendVoiceTurn: vi.fn(),
  startLiveSession: vi.fn(),
  updateQuestionStatus: vi.fn(),
  updateSessionName: vi.fn()
}));

async function flushAsync() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('scoring UI', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.__E2E__ = true;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete window.__E2E__;
    delete window.__APP_CONFIG__;
    delete window.__e2eState;
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('shows scoring progress then renders results', async () => {
    let resolveScore;
    scoreInterview.mockImplementation(() => new Promise((resolve) => {
      resolveScore = resolve;
    }));

    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const state = window.__e2eState;
    state.interviewId = 'interview-1';
    state.sessionActive = true;
    state.transcript = [{ role: 'candidate', text: 'Hi', timestamp: '' }];

    const stopButton = layout.querySelector('[data-testid="stop-interview"]');
    stopButton.disabled = false;
    stopButton.click();

    const scoreValue = layout.querySelector('[data-testid="score-value"]');
    const scoreSummary = layout.querySelector('.ui-score__summary');
    expect(scoreValue?.textContent).toBe('--');
    expect(scoreSummary?.textContent).toContain('Scoring');

    resolveScore({
      overall_score: 88,
      summary: 'Nice.',
      strengths: [],
      improvements: []
    });
    await flushAsync();

    expect(scoreInterview).toHaveBeenCalledTimes(1);
    expect(scoreValue?.textContent).toBe('88 / 100');
  });
});
