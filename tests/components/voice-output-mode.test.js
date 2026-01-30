import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildVoiceLayout } from '../../app/static/js/ui.js';

describe('turn voice output', () => {
  beforeEach(() => {
    window.__E2E__ = true;
    window.__APP_CONFIG__ = {
      voiceMode: 'turn',
      voiceOutputMode: 'browser',
      voiceTtsLanguage: 'en-US'
    };
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete window.__E2E__;
    delete window.__APP_CONFIG__;
    delete window.speechSynthesis;
    delete window.SpeechSynthesisUtterance;
    document.body.innerHTML = '';
  });

  it('sets SpeechSynthesis language to en-US', () => {
    const speak = vi.fn();
    window.speechSynthesis = { speak, cancel: vi.fn() };
    window.SpeechSynthesisUtterance = function SpeechSynthesisUtterance(text) {
      this.text = text;
    };

    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    expect(window.__e2ePlayCoachReply).toBeTypeOf('function');

    window.__e2ePlayCoachReply({ text: 'Hello', audio: null });
    vi.advanceTimersByTime(1000);

    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0].lang).toBe('en-US');
  });

  it('falls back to browser speech when server audio is missing', () => {
    window.__APP_CONFIG__ = {
      voiceMode: 'turn',
      voiceOutputMode: 'server',
      voiceTtsLanguage: 'en-US'
    };

    const speak = vi.fn();
    window.speechSynthesis = { speak, cancel: vi.fn() };
    window.SpeechSynthesisUtterance = function SpeechSynthesisUtterance(text) {
      this.text = text;
    };

    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    expect(window.__e2ePlayCoachReply).toBeTypeOf('function');

    window.__e2ePlayCoachReply({ text: 'Fallback audio', audio: null });
    vi.advanceTimersByTime(1000);

    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0].text).toBe('Fallback audio');
  });
});
