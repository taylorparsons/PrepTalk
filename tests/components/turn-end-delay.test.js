import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildVoiceLayout } from '../../app/static/js/ui.js';
import { sendVoiceTurn } from '../../app/static/js/api/client.js';

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
  sendVoiceTurn: vi.fn().mockResolvedValue({
    candidate: { role: 'candidate', text: 'Hi' },
    coach: { role: 'coach', text: 'Hello' }
  }),
  startLiveSession: vi.fn(),
  updateQuestionStatus: vi.fn(),
  updateSessionName: vi.fn()
}));

class MockSpeechRecognition {
  constructor() {
    window.__lastRecognition = this;
  }

  start() {}

  stop() {}
}

describe('turn end delay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.__E2E__ = true;
    window.__APP_CONFIG__ = {
      voiceMode: 'turn',
      voiceOutputMode: 'browser',
      voiceTurnEndDelayMs: 1000
    };
    window.SpeechRecognition = MockSpeechRecognition;
    window.webkitSpeechRecognition = MockSpeechRecognition;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete window.__APP_CONFIG__;
    delete window.__E2E__;
    delete window.__e2eState;
    delete window.__lastRecognition;
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
    document.body.innerHTML = '';
  });

  it('delays sending a turn after final speech', () => {
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const state = window.__e2eState;
    state.interviewId = 'interview-1';

    const startButton = document.querySelector('[data-testid="start-interview"]');
    startButton.disabled = false;
    startButton.click();

    const recognition = window.__lastRecognition;
    const result = { 0: { transcript: 'Hello' }, isFinal: true, length: 1 };
    recognition.onresult({ resultIndex: 0, results: [result] });

    expect(sendVoiceTurn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(999);
    expect(sendVoiceTurn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(sendVoiceTurn).toHaveBeenCalledTimes(1);
  });
});
