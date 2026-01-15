const DEFAULT_FRAME_INTERVAL_MS = 20;

export function createAudioFrameBuffer({ maxFrames = 60 } = {}) {
  const frames = [];

  function push(frame) {
    if (!frame || frame.length === 0) return;
    frames.push(frame);
    if (frames.length > maxFrames) {
      frames.splice(0, frames.length - maxFrames);
    }
  }

  function shift() {
    return frames.shift() || null;
  }

  function clear() {
    frames.length = 0;
  }

  function size() {
    return frames.length;
  }

  return {
    push,
    shift,
    clear,
    size
  };
}

export function createAudioFrameFlusher({
  buffer,
  sendFrame,
  frameIntervalMs = DEFAULT_FRAME_INTERVAL_MS,
  shouldSend = () => true
} = {}) {
  let timer = null;

  function stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  }

  function tick() {
    if (!buffer || typeof sendFrame !== 'function') {
      stop();
      return;
    }
    if (!shouldSend()) {
      stop();
      return;
    }
    const frame = buffer.shift();
    if (!frame) {
      stop();
      return;
    }
    sendFrame(frame);
  }

  function start() {
    if (timer) return false;
    timer = setInterval(tick, frameIntervalMs);
    return true;
  }

  function isActive() {
    return timer !== null;
  }

  return {
    start,
    stop,
    isActive
  };
}
