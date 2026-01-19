import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildVoiceLayout } from '../../app/static/js/ui.js';

describe('live voice output mode', () => {
  beforeEach(() => {
    window.__E2E__ = true;
    window.__APP_CONFIG__ = {
      voiceMode: 'live',
      voiceOutputMode: 'browser'
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

  it('speaks coach transcript in live mode when browser output is selected', () => {
    const speak = vi.fn();
    window.speechSynthesis = { speak, cancel: vi.fn() };
    window.SpeechSynthesisUtterance = function SpeechSynthesisUtterance(text) {
      this.text = text;
    };

    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    expect(window.__e2eHandleTranscript).toBeTypeOf('function');

    window.__e2eHandleTranscript({
      role: 'coach',
      text: 'Hello there',
      timestamp: ''
    });

    vi.advanceTimersByTime(1000);

    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0].text).toBe('Hello there');
  });

  it('speaks in auto mode when live audio payload is empty', () => {
    window.__APP_CONFIG__ = {
      voiceMode: 'live',
      voiceOutputMode: 'auto'
    };
    const speak = vi.fn();
    window.speechSynthesis = { speak, cancel: vi.fn() };
    window.SpeechSynthesisUtterance = function SpeechSynthesisUtterance(text) {
      this.text = text;
    };

    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    expect(window.__e2eHandleLiveAudio).toBeTypeOf('function');
    expect(window.__e2eHandleTranscript).toBeTypeOf('function');

    window.__e2eHandleLiveAudio(new ArrayBuffer(0));
    window.__e2eHandleTranscript({
      role: 'coach',
      text: 'Testing auto audio',
      timestamp: ''
    });

    vi.advanceTimersByTime(1000);

    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0].text).toBe('Testing auto audio');
  });

  it('defaults to browser output in turn mode', () => {
    window.__APP_CONFIG__ = {
      voiceMode: 'turn',
      voiceOutputMode: 'auto'
    };

    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const select = document.querySelector('[data-testid="voice-output-select"]');
    expect(select.value).toBe('browser');
  });

  it('sets SpeechSynthesis language to en-US', () => {
    window.__APP_CONFIG__ = {
      voiceMode: 'turn',
      voiceOutputMode: 'browser',
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

    window.__e2ePlayCoachReply({ text: 'Hello', audio: null });
    vi.advanceTimersByTime(1000);

    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0].lang).toBe('en-US');
  });
});
