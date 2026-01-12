import { describe, it, expect, vi, afterEach } from 'vitest';
import { clearGeminiReconnect, scheduleGeminiReconnect } from '../../app/static/js/ui.js';

describe('gemini reconnect', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('schedules a reconnect and restarts the transport', () => {
    vi.useFakeTimers();
    const start = vi.fn();
    const state = {
      sessionActive: true,
      transport: { start },
      interviewId: 'interview-1',
      userId: 'user-1',
      geminiReconnectAttempts: 0,
      geminiReconnectTimer: null
    };
    const statusPill = document.createElement('div');

    const scheduled = scheduleGeminiReconnect(state, { statusPill });

    expect(scheduled).toBe(true);
    expect(state.geminiReconnectAttempts).toBe(1);

    vi.runAllTimers();

    expect(start).toHaveBeenCalledWith('interview-1', 'user-1');
  });

  it('does not schedule when the session is inactive', () => {
    vi.useFakeTimers();
    const start = vi.fn();
    const state = {
      sessionActive: false,
      transport: { start },
      interviewId: 'interview-1',
      userId: 'user-1',
      geminiReconnectAttempts: 0,
      geminiReconnectTimer: null
    };

    expect(scheduleGeminiReconnect(state)).toBe(false);
    vi.runAllTimers();
    expect(start).not.toHaveBeenCalled();
  });

  it('clears pending reconnect timers and resets attempts', () => {
    vi.useFakeTimers();
    const start = vi.fn();
    const state = {
      sessionActive: true,
      transport: { start },
      interviewId: 'interview-1',
      userId: 'user-1',
      geminiReconnectAttempts: 0,
      geminiReconnectTimer: null
    };

    scheduleGeminiReconnect(state);
    clearGeminiReconnect(state);

    expect(state.geminiReconnectAttempts).toBe(0);
    expect(state.geminiReconnectTimer).toBe(null);

    vi.runAllTimers();
    expect(start).not.toHaveBeenCalled();
  });
});
