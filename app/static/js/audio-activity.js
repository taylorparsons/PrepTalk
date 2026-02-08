const DEFAULT_FRAME_MS = 20;
const DEFAULT_SILENCE_THRESHOLD = 0.02;
const DEFAULT_SILENCE_WINDOW_MS = 400;
const DEFAULT_START_WINDOW_MS = 120;

function calculateRms(pcm16) {
  if (!pcm16 || pcm16.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < pcm16.length; i += 1) {
    const sample = pcm16[i] / 32768;
    sum += sample * sample;
  }
  return Math.sqrt(sum / pcm16.length);
}

export function createActivityDetector({
  frameDurationMs = DEFAULT_FRAME_MS,
  silenceThreshold = DEFAULT_SILENCE_THRESHOLD,
  silenceWindowMs = DEFAULT_SILENCE_WINDOW_MS,
  startWindowMs = DEFAULT_START_WINDOW_MS
} = {}) {
  let inSpeech = false;
  let silenceMs = 0;
  let voicedMs = 0;

  function update(frame) {
    const rms = calculateRms(frame);
    const voiced = rms >= silenceThreshold;

    if (voiced) {
      silenceMs = 0;
      if (inSpeech) {
        return null;
      }
      voicedMs += frameDurationMs;
      if (voicedMs >= startWindowMs) {
        inSpeech = true;
        voicedMs = 0;
        return 'start';
      }
      return null;
    }

    voicedMs = 0;

    if (!inSpeech) {
      return null;
    }

    silenceMs += frameDurationMs;
    if (silenceMs >= silenceWindowMs) {
      inSpeech = false;
      silenceMs = 0;
      return 'end';
    }
    return null;
  }

  function reset() {
    inSpeech = false;
    silenceMs = 0;
    voicedMs = 0;
  }

  function isActive() {
    return inSpeech;
  }

  return {
    update,
    reset,
    isActive
  };
}
