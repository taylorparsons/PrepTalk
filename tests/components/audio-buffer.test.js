import { describe, it, expect, vi, afterEach } from 'vitest';
import { createAudioFrameBuffer, createAudioFrameFlusher } from '../../app/static/js/audio-buffer.js';

describe('audio buffer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('drops oldest frames when over max', () => {
    const buffer = createAudioFrameBuffer({ maxFrames: 2 });
    const frame1 = new Int16Array([1]);
    const frame2 = new Int16Array([2]);
    const frame3 = new Int16Array([3]);

    buffer.push(frame1);
    buffer.push(frame2);
    buffer.push(frame3);

    expect(buffer.size()).toBe(2);
    expect(buffer.shift()).toBe(frame2);
    expect(buffer.shift()).toBe(frame3);
    expect(buffer.shift()).toBe(null);
  });

  it('flushes frames in order and stops', () => {
    vi.useFakeTimers();
    const buffer = createAudioFrameBuffer({ maxFrames: 3 });
    const frame1 = new Int16Array([1]);
    const frame2 = new Int16Array([2]);
    const frame3 = new Int16Array([3]);
    buffer.push(frame1);
    buffer.push(frame2);
    buffer.push(frame3);

    const sendFrame = vi.fn();
    const flusher = createAudioFrameFlusher({
      buffer,
      sendFrame,
      frameIntervalMs: 10,
      shouldSend: () => true
    });

    flusher.start();
    vi.advanceTimersByTime(40);

    expect(sendFrame.mock.calls).toEqual([[frame1], [frame2], [frame3]]);
    expect(flusher.isActive()).toBe(false);
  });

  it('stops when shouldSend is false', () => {
    vi.useFakeTimers();
    const buffer = createAudioFrameBuffer({ maxFrames: 1 });
    buffer.push(new Int16Array([9]));

    const sendFrame = vi.fn();
    const flusher = createAudioFrameFlusher({
      buffer,
      sendFrame,
      frameIntervalMs: 10,
      shouldSend: () => false
    });

    flusher.start();
    vi.advanceTimersByTime(20);

    expect(sendFrame).not.toHaveBeenCalled();
    expect(flusher.isActive()).toBe(false);
  });
});
