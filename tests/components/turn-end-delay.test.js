import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildVoiceLayout } from '../../app/static/js/ui.js';
import {
  sendVoiceFeedback,
  sendVoiceIntro,
  sendVoiceTurn,
  sendVoiceTurnCompletion
} from '../../app/static/js/api/client.js';

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
  sendVoiceFeedback: vi.fn().mockResolvedValue({
    feedback: { role: 'coach_feedback', text: 'Nice structure.' }
  }),
  sendVoiceIntro: vi.fn().mockResolvedValue({
    coach: { role: 'coach', text: 'Welcome! What brings you here today?' }
  }),
  sendVoiceTurnCompletion: vi.fn().mockResolvedValue({
    decision: 'complete',
    confidence: 0.95,
    attempted: true
  }),
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

async function flushAsync() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('turn end delay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.__E2E__ = true;
    window.__APP_CONFIG__ = {
      voiceMode: 'turn',
      voiceOutputMode: 'browser',
      voiceTurnEndDelayMs: 1000,
      voiceTurnCompletionConfidence: 0.9,
      voiceTurnCompletionCooldownMs: 200
    };
    window.SpeechRecognition = MockSpeechRecognition;
    window.webkitSpeechRecognition = MockSpeechRecognition;
    sendVoiceFeedback.mockClear();
    sendVoiceIntro.mockClear();
    sendVoiceTurnCompletion.mockClear();
    sendVoiceTurn.mockClear();
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

  it('enables submit after the configured delay', async () => {
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const state = window.__e2eState;
    state.interviewId = 'interview-1';

    const startButton = document.querySelector('[data-testid="start-interview"]');
    startButton.disabled = false;
    startButton.click();
    await flushAsync();
    expect(sendVoiceIntro).toHaveBeenCalledTimes(1);

    const recognition = window.__lastRecognition;
    expect(recognition).toBeDefined();
    const result = { 0: { transcript: 'Hello' }, isFinal: true, length: 1 };
    recognition.onresult({ resultIndex: 0, results: [result] });

    expect(sendVoiceTurn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(999);
    expect(sendVoiceTurn).not.toHaveBeenCalled();
    expect(sendVoiceTurnCompletion).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    await flushAsync();
    expect(sendVoiceTurnCompletion).toHaveBeenCalledTimes(1);

    const submitButton = document.querySelector('[data-testid="submit-turn"]');
    expect(submitButton).not.toBeNull();
    expect(submitButton?.disabled).toBe(false);
    submitButton.click();

    await flushAsync();
    expect(sendVoiceTurn).toHaveBeenCalledTimes(1);
  });

  it('still enables submit when completion confidence is below the threshold', async () => {
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const state = window.__e2eState;
    state.interviewId = 'interview-1';

    sendVoiceTurnCompletion.mockResolvedValueOnce({
      decision: 'partial',
      confidence: 0.2,
      attempted: true
    });

    const startButton = document.querySelector('[data-testid="start-interview"]');
    startButton.disabled = false;
    startButton.click();
    await flushAsync();

    const recognition = window.__lastRecognition;
    const result = { 0: { transcript: 'I started by...' }, isFinal: true, length: 1 };
    recognition.onresult({ resultIndex: 0, results: [result] });

    vi.advanceTimersByTime(1000);
    await flushAsync();
    expect(sendVoiceTurnCompletion).toHaveBeenCalledTimes(1);
    const submitButton = document.querySelector('[data-testid="submit-turn"]');
    expect(submitButton).not.toBeNull();
    expect(submitButton?.disabled).toBe(false);
  });

  it('does not enable submit before a coach question is awaiting an answer', async () => {
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const state = window.__e2eState;
    state.interviewId = 'interview-1';

    const startButton = document.querySelector('[data-testid="start-interview"]');
    startButton.disabled = false;
    startButton.click();
    await flushAsync();

    state.turnAwaitingAnswer = false;
    const recognition = window.__lastRecognition;
    expect(recognition).toBeDefined();
    const result = { 0: { transcript: 'Hello' }, isFinal: true, length: 1 };
    recognition.onresult({ resultIndex: 0, results: [result] });

    vi.advanceTimersByTime(1000);
    const submitButton = document.querySelector('[data-testid="submit-turn"]');
    expect(submitButton).not.toBeNull();
    expect(submitButton?.disabled).toBe(true);
    expect(sendVoiceTurn).not.toHaveBeenCalled();
    expect(sendVoiceTurnCompletion).not.toHaveBeenCalled();
  });

  it('submits a turn when the candidate says "submit my answer"', async () => {
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const state = window.__e2eState;
    state.interviewId = 'interview-1';

    const startButton = document.querySelector('[data-testid="start-interview"]');
    startButton.disabled = false;
    startButton.click();
    await flushAsync();

    const recognition = window.__lastRecognition;
    const result = { 0: { transcript: 'I built the system. submit my answer' }, isFinal: true, length: 1 };
    recognition.onresult({ resultIndex: 0, results: [result] });

    await flushAsync();
    await flushAsync();

    expect(sendVoiceTurn).toHaveBeenCalledTimes(1);
    expect(sendVoiceTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'I built the system.'
      })
    );
  });

  it('appends coach feedback after a turn', async () => {
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const state = window.__e2eState;
    state.interviewId = 'interview-1';
    state.sessionActive = true;
    state.lastCoachQuestion = 'Tell me about a challenge you solved?';

    window.__e2eQueueTurn?.('I handled a tricky rollout.');
    await flushAsync();
    await flushAsync();

    expect(sendVoiceFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        interviewId: 'interview-1',
        question: 'Tell me about a challenge you solved?',
        answer: 'I handled a tricky rollout.'
      })
    );
    expect(state.transcript.some((entry) => entry.role === 'coach_feedback')).toBe(true);
  });
});
