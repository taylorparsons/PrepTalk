import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createAudioPlayback } from '../../app/static/js/voice.js';

describe('voice playback sample rate', () => {
  const originalAudioContext = globalThis.AudioContext;
  const originalConfig = window.PREPTALK_AUDIO_CONFIG;
  const calls = {
    createBufferSampleRate: null,
    contextSampleRate: null
  };

  function installAudioContextMock() {
    class MockAudioContext {
      constructor(options = {}) {
        this.sampleRate = options.sampleRate || 24000;
        this.currentTime = 0;
        this.state = 'running';
        calls.contextSampleRate = this.sampleRate;
      }

      createBuffer(_channels, length, sampleRate) {
        calls.createBufferSampleRate = sampleRate;
        const data = new Float32Array(length);
        const buffer = {
          duration: length / sampleRate,
          getChannelData: () => data
        };
        return buffer;
      }

      createBufferSource() {
        return {
          buffer: null,
          connect: vi.fn(),
          start: vi.fn()
        };
      }

      async resume() {}

      async close() {
        this.state = 'closed';
      }
    }

    globalThis.AudioContext = MockAudioContext;
  }

  beforeEach(() => {
    installAudioContextMock();
    calls.createBufferSampleRate = null;
    calls.contextSampleRate = null;
    window.PREPTALK_AUDIO_CONFIG = {
      sampleRate: 48000,
      frameSize: 20,
      bufferSize: 2048,
      profile: 'test'
    };
  });

  afterEach(() => {
    globalThis.AudioContext = originalAudioContext;
    window.PREPTALK_AUDIO_CONFIG = originalConfig;
  });

  it('uses explicit stream sample rate for playback', async () => {
    const playback = createAudioPlayback({ sampleRate: 16000 });
    playback.play(new Int16Array([0, 1000, -1000]));
    await playback.stop();
    expect(calls.contextSampleRate).toBe(16000);
    expect(calls.createBufferSampleRate).toBe(16000);
  });

  it('keeps stream sample rate even if output context runs at a different rate', async () => {
    class FixedRateContext {
      constructor() {
        this.sampleRate = 48000;
        this.currentTime = 0;
        this.state = 'running';
      }

      createBuffer(_channels, length, sampleRate) {
        calls.createBufferSampleRate = sampleRate;
        const data = new Float32Array(length);
        return {
          duration: length / sampleRate,
          getChannelData: () => data
        };
      }

      createBufferSource() {
        return {
          buffer: null,
          connect: vi.fn(),
          start: vi.fn()
        };
      }

      async resume() {}

      async close() {
        this.state = 'closed';
      }
    }

    globalThis.AudioContext = FixedRateContext;
    calls.createBufferSampleRate = null;
    const playback = createAudioPlayback({ sampleRate: 24000 });
    playback.play(new Int16Array([0, 1000, -1000]));
    await playback.stop();
    expect(calls.createBufferSampleRate).toBe(24000);
  });
});
