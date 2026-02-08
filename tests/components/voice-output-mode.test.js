import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildVoiceLayout } from '../../app/static/js/ui.js';

describe('turn voice output', () => {
  beforeEach(() => {
    window.__E2E__ = true;
    window.__E2E_ALLOW_TTS = true;
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
    delete window.__E2E_ALLOW_TTS;
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

  it('recovers if browser speech callbacks never fire', async () => {
    window.__APP_CONFIG__ = {
      voiceMode: 'turn',
      voiceOutputMode: 'browser',
      voiceTtsLanguage: 'en-US'
    };

    const speak = vi.fn();
    const cancel = vi.fn();
    window.speechSynthesis = { speak, cancel };
    window.SpeechSynthesisUtterance = function SpeechSynthesisUtterance(text) {
      this.text = text;
    };

    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const state = window.__e2eState;
    state.sessionActive = true;
    state.turnAwaitingAnswer = true;

    const playPromise = window.__e2ePlayCoachReply({
      text: 'This response should not leave the UI stuck in speaking state.',
      audio: null
    });

    vi.advanceTimersByTime(10000);
    await playPromise;

    expect(speak).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalled();
    expect(state.turnSpeaking).toBe(false);
  });

  it('falls back to browser speech when server audio never starts playback', async () => {
    window.__APP_CONFIG__ = {
      voiceMode: 'turn',
      voiceOutputMode: 'server',
      voiceTtsLanguage: 'en-US'
    };

    const speak = vi.fn((utterance) => {
      utterance.onend?.();
    });
    window.speechSynthesis = { speak, cancel: vi.fn() };
    window.SpeechSynthesisUtterance = function SpeechSynthesisUtterance(text) {
      this.text = text;
    };

    const createObjectURL = vi.fn(() => 'blob:mock-audio');
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const originalCanPlayType = HTMLMediaElement.prototype.canPlayType;
    HTMLMediaElement.prototype.canPlayType = vi.fn(() => 'probably');

    class MockAudio {
      constructor() {
        this.onended = null;
        this.onerror = null;
        this.onabort = null;
        this.onplaying = null;
      }
      setAttribute() {}
      pause() {}
      play() {
        // Mimic iOS failure mode: play() resolves but media never reaches "playing".
        setTimeout(() => {
          this.onended?.();
        }, 0);
        return Promise.resolve();
      }
    }
    globalThis.Audio = MockAudio;

    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    expect(window.__e2ePlayCoachReply).toBeTypeOf('function');

    const audioBytes = btoa('\x00\x01\x02\x03');
    try {
      const playPromise = window.__e2ePlayCoachReply({
        text: 'Use browser speech fallback',
        audio: audioBytes,
        audioMime: 'audio/wav'
      });
      vi.runAllTimers();
      await playPromise;

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledTimes(1);
      expect(speak).toHaveBeenCalledTimes(1);
      expect(speak.mock.calls[0][0].text).toBe('Use browser speech fallback');
    } finally {
      HTMLMediaElement.prototype.canPlayType = originalCanPlayType;
    }
  });

  it('falls back to browser speech when server audio mime is not playable', async () => {
    window.__APP_CONFIG__ = {
      voiceMode: 'turn',
      voiceOutputMode: 'server',
      voiceTtsLanguage: 'en-US'
    };

    const speak = vi.fn((utterance) => {
      utterance.onend?.();
    });
    window.speechSynthesis = { speak, cancel: vi.fn() };
    window.SpeechSynthesisUtterance = function SpeechSynthesisUtterance(text) {
      this.text = text;
    };

    const createObjectURL = vi.fn(() => 'blob:mock-audio');
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const originalCanPlayType = HTMLMediaElement.prototype.canPlayType;
    HTMLMediaElement.prototype.canPlayType = vi.fn(() => '');

    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const audioBytes = btoa('\x00\x01\x02\x03');
    try {
      await window.__e2ePlayCoachReply({
        text: 'Fallback because mime is unsupported',
        audio: audioBytes,
        audioMime: 'audio/pcm;rate=24000'
      });

      expect(createObjectURL).toHaveBeenCalledTimes(0);
      expect(revokeObjectURL).toHaveBeenCalledTimes(0);
      expect(speak).toHaveBeenCalledTimes(1);
      expect(speak.mock.calls[0][0].text).toBe('Fallback because mime is unsupported');
    } finally {
      HTMLMediaElement.prototype.canPlayType = originalCanPlayType;
    }
  });
});
