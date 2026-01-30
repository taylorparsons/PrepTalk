import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildVoiceLayout } from '../../app/static/js/ui.js';

describe('live voice output mode', () => {
  beforeEach(() => {
    window.__E2E__ = true;
    window.__APP_CONFIG__ = {
      voiceMode: 'live',
      voiceOutputMode: 'browser',
      uiDevMode: true
    };
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete window.__E2E__;
    delete window.__APP_CONFIG__;
    delete window.speechSynthesis;
    delete window.SpeechSynthesisUtterance;
    delete window.AudioContext;
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

  it('does not speak in auto mode when live audio is missing', () => {
    window.__APP_CONFIG__ = {
      voiceMode: 'live',
      voiceOutputMode: 'auto',
      uiDevMode: true
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

    expect(speak).not.toHaveBeenCalled();
  });

  it('does not speak when live audio arrives in auto mode', () => {
    window.__APP_CONFIG__ = {
      voiceMode: 'live',
      voiceOutputMode: 'auto',
      uiDevMode: true
    };
    window.AudioContext = class AudioContext {
      constructor() {
        this.destination = {};
        this.currentTime = 0;
        this.state = 'running';
      }
      createBuffer() {
        return {
          duration: 0.1,
          getChannelData: () => new Float32Array(4)
        };
      }
      createBufferSource() {
        return {
          connect: () => {},
          start: () => {}
        };
      }
      resume() {
        return Promise.resolve();
      }
      close() {
        return Promise.resolve();
      }
    };
    const speak = vi.fn();
    window.speechSynthesis = { speak, cancel: vi.fn() };
    window.SpeechSynthesisUtterance = function SpeechSynthesisUtterance(text) {
      this.text = text;
    };

    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    expect(window.__e2eHandleTranscript).toBeTypeOf('function');
    expect(window.__e2eHandleLiveAudio).toBeTypeOf('function');

    window.__e2eHandleTranscript({
      role: 'coach',
      text: 'Audio should take priority',
      timestamp: ''
    });
    window.__e2eHandleLiveAudio({
      pcm16: new Int16Array([1, 2, 3, 4]).buffer,
      sample_rate: 24000
    });

    vi.advanceTimersByTime(1000);

    expect(speak).not.toHaveBeenCalled();
  });

  it('still speaks in browser mode even if live audio arrives', () => {
    window.__APP_CONFIG__ = {
      voiceMode: 'live',
      voiceOutputMode: 'browser',
      uiDevMode: true
    };
    const speak = vi.fn();
    window.speechSynthesis = { speak, cancel: vi.fn() };
    window.SpeechSynthesisUtterance = function SpeechSynthesisUtterance(text) {
      this.text = text;
    };

    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    window.__e2eHandleLiveAudio({
      pcm16: new Int16Array([1, 2, 3, 4]).buffer,
      sample_rate: 24000
    });
    window.__e2eHandleTranscript({
      role: 'coach',
      text: 'Browser mode should speak',
      timestamp: ''
    });

    vi.advanceTimersByTime(1000);

    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0].text).toBe('Browser mode should speak');
  });

  it('defaults to browser output in turn mode', () => {
    window.__APP_CONFIG__ = {
      voiceMode: 'turn',
      voiceOutputMode: 'auto',
      uiDevMode: true
    };

    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const select = document.querySelector('[data-testid="voice-output-select"]');
    expect(select.value).toBe('auto');
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

  it('falls back to browser speech when server audio is missing in turn mode', () => {
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
