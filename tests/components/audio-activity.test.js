import { describe, it, expect } from 'vitest';
import { createActivityDetector } from '../../app/static/js/audio-activity.js';

function frame(value, length = 160) {
  return new Int16Array(Array.from({ length }, () => value));
}

describe('activity detector', () => {
  it('emits start only after sustained voiced frames', () => {
    const detector = createActivityDetector({
      frameDurationMs: 20,
      silenceThreshold: 0.02,
      silenceWindowMs: 60,
      startWindowMs: 60
    });

    expect(detector.update(frame(0))).toBe(null);
    expect(detector.update(frame(10000))).toBe(null);
    expect(detector.update(frame(10000))).toBe(null);
    expect(detector.update(frame(10000))).toBe('start');
    expect(detector.update(frame(10000))).toBe(null);
  });

  it('emits end after sustained silence', () => {
    const detector = createActivityDetector({
      frameDurationMs: 20,
      silenceThreshold: 0.02,
      silenceWindowMs: 60,
      startWindowMs: 20
    });

    expect(detector.update(frame(12000))).toBe('start');
    expect(detector.update(frame(0))).toBe(null);
    expect(detector.update(frame(0))).toBe(null);
    expect(detector.update(frame(0))).toBe('end');
  });

  it('emits start again after end', () => {
    const detector = createActivityDetector({
      frameDurationMs: 20,
      silenceThreshold: 0.02,
      silenceWindowMs: 40,
      startWindowMs: 20
    });

    expect(detector.update(frame(12000))).toBe('start');
    expect(detector.update(frame(0))).toBe(null);
    expect(detector.update(frame(0))).toBe('end');
    expect(detector.update(frame(12000))).toBe('start');
  });

  it('ignores short transient noise bursts', () => {
    const detector = createActivityDetector({
      frameDurationMs: 20,
      silenceThreshold: 0.02,
      silenceWindowMs: 60,
      startWindowMs: 120
    });

    expect(detector.update(frame(12000))).toBe(null);
    expect(detector.update(frame(0))).toBe(null);
    expect(detector.update(frame(12000))).toBe(null);
    expect(detector.update(frame(0))).toBe(null);
  });
});
