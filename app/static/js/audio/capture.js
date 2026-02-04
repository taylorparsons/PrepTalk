/**
 * Microphone capture using AudioWorklet.
 * Provides same API as voice.js but uses modern off-thread architecture.
 *
 * @module audio/capture
 */

// Adaptive config from preflight-audio.js
const getAdaptiveConfig = () => {
  const config = window.PREPTALK_AUDIO_CONFIG || {
    sampleRate: 24000,
    frameSize: 20,
    bufferSize: 2048,
    profile: 'fallback'
  };

  // Log when adaptive config is applied
  if (window.PREPTALK_AUDIO_CONFIG) {
    console.log('🎙️ Using adaptive config:', config.profile, {
      sampleRate: `${config.sampleRate / 1000}kHz`,
      frameSize: `${config.frameSize}ms`,
      bufferSize: config.bufferSize
    });
  }

  return config;
};

let workletLoaded = false;
let preloadedContext = null;

/**
 * Preload the AudioWorklet module.
 * Call this early (e.g., on page load) to warm up the cache.
 * The worklet will be ready instantly when startMicrophoneCapture is called.
 */
export async function preloadAudioWorklet() {
  if (workletLoaded) return;

  try {
    // Apply adaptive config for sample rate
    const adaptiveConfig = getAdaptiveConfig();

    // Create a temporary context just to load the worklet
    preloadedContext = new AudioContext({ sampleRate: adaptiveConfig.sampleRate });
    await preloadedContext.audioWorklet.addModule('/static/js/workers/audio-processor.worklet.js');
    workletLoaded = true;

    // Suspend the context to save resources until needed
    if (preloadedContext.state === 'running') {
      await preloadedContext.suspend();
    }
  } catch (error) {
    console.warn('AudioWorklet preload failed, will load on demand:', error);
    workletLoaded = false;
    preloadedContext = null;
  }
}

/**
 * Start microphone capture using AudioWorklet.
 *
 * @param {Object} options
 * @param {Function} options.onAudioFrame - Called with Int16Array PCM data
 * @param {Function} options.onStatus - Called with status updates
 * @param {Function} options.onSpeechStart - Called when speech detected
 * @param {Function} options.onSpeechEnd - Called when speech ends
 * @param {Function} options.onActivity - Called with activity level
 * @param {number} options.targetSampleRate - Output sample rate (default 24000)
 * @returns {Promise<{stop: Function, sampleRate: number}>}
 */
export async function startMicrophoneCapture({
  onAudioFrame,
  onStatus,
  onSpeechStart,
  onSpeechEnd,
  onActivity,
  targetSampleRate = 24000
} = {}) {
  if (!navigator?.mediaDevices?.getUserMedia) {
    throw new Error('Microphone capture not supported in this browser.');
  }

  // Check for AudioWorklet support
  if (!window.AudioWorkletNode) {
    throw new Error('AudioWorklet not supported. Please use a modern browser.');
  }

  // Apply adaptive config with fallback defaults
  const adaptiveConfig = getAdaptiveConfig();
  targetSampleRate = adaptiveConfig.sampleRate;

  // Get microphone permission and stream
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      noiseSuppression: true,
      echoCancellation: true,
      autoGainControl: true
    }
  });

  // Use preloaded context or create new one
  let context;
  if (preloadedContext && workletLoaded) {
    context = preloadedContext;
    preloadedContext = null; // Don't reuse
    if (context.state === 'suspended') {
      await context.resume();
    }
  } else {
    context = new AudioContext({ sampleRate: targetSampleRate });
    if (context.state === 'suspended') {
      await context.resume();
    }
    // Load worklet if not preloaded
    if (!workletLoaded) {
      await context.audioWorklet.addModule('/static/js/workers/audio-processor.worklet.js');
    }
  }

  // Create worklet node with options
  const workletNode = new AudioWorkletNode(context, 'audio-capture', {
    processorOptions: {
      targetSampleRate,
      speechThreshold: 0.02,
      silenceHoldFrames: 6
    }
  });

  // Handle messages from worklet (runs on audio thread)
  workletNode.port.onmessage = (event) => {
    const { type, buffer, speaking, level } = event.data;

    switch (type) {
      case 'audio':
        onAudioFrame?.(new Int16Array(buffer));
        break;
      case 'speech_start':
        onSpeechStart?.();
        break;
      case 'speech_end':
        onSpeechEnd?.();
        break;
      case 'activity':
        onActivity?.({ speaking, level });
        break;
    }
  };

  // Connect microphone to worklet
  const source = context.createMediaStreamSource(stream);
  source.connect(workletNode);
  // Note: Don't connect to destination - we process only, no playback

  onStatus?.('ready');

  // Cleanup function
  async function stop() {
    try {
      workletNode.port.close();
      workletNode.disconnect();
      source.disconnect();
      stream.getTracks().forEach(track => track.stop());
      if (context.state !== 'closed') {
        await context.close();
      }
    } catch (error) {
      console.warn('Error during audio cleanup:', error);
    }
  }

  return {
    stop,
    sampleRate: targetSampleRate,
    context // Expose for debugging
  };
}

/**
 * Check if AudioWorklet is supported in this browser.
 */
export function isAudioWorkletSupported() {
  return typeof window !== 'undefined' &&
    window.AudioWorkletNode !== undefined &&
    navigator?.mediaDevices?.getUserMedia !== undefined;
}
