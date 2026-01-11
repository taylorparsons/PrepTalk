const DEFAULT_SAMPLE_RATE = 24000;
const DEFAULT_FRAME_MS = 20;

function downsampleBuffer(buffer, inputRate, outputRate) {
  if (outputRate >= inputRate) {
    return buffer;
  }

  const sampleRateRatio = inputRate / outputRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i += 1) {
      accum += buffer[i];
      count += 1;
    }
    result[offsetResult] = count ? accum / count : 0;
    offsetResult += 1;
    offsetBuffer = nextOffsetBuffer;
  }

  return result;
}

function floatTo16BitPCM(buffer) {
  const output = new Int16Array(buffer.length);
  for (let i = 0; i < buffer.length; i += 1) {
    let sample = buffer[i];
    sample = Math.max(-1, Math.min(1, sample));
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
}

function pcm16ToFloat32(pcm16) {
  const output = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i += 1) {
    output[i] = pcm16[i] / 0x8000;
  }
  return output;
}

export function decodePcm16Base64(base64) {
  if (!base64) return null;
  if (typeof atob === 'undefined') return null;
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) {
    view[i] = binary.charCodeAt(i);
  }
  return new Int16Array(buffer);
}

export async function startMicrophoneCapture({
  onAudioFrame,
  onStatus,
  targetSampleRate = DEFAULT_SAMPLE_RATE,
  frameDurationMs = DEFAULT_FRAME_MS
} = {}) {
  if (!navigator?.mediaDevices?.getUserMedia) {
    throw new Error('Microphone capture not supported.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      noiseSuppression: true,
      echoCancellation: true,
      autoGainControl: true
    }
  });

  const context = new AudioContext();
  if (context.state === 'suspended') {
    await context.resume();
  }
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(2048, 1, 1);
  const inputSampleRate = context.sampleRate;
  const frameSize = Math.round((targetSampleRate * frameDurationMs) / 1000);

  onStatus?.('ready');

  processor.onaudioprocess = (event) => {
    const inputBuffer = event.inputBuffer.getChannelData(0);
    const downsampled = downsampleBuffer(inputBuffer, inputSampleRate, targetSampleRate);
    const pcm16 = floatTo16BitPCM(downsampled);

    for (let i = 0; i < pcm16.length; i += frameSize) {
      const frame = pcm16.subarray(i, i + frameSize);
      if (frame.length > 0) {
        onAudioFrame?.(frame);
      }
    }
  };

  source.connect(processor);
  processor.connect(context.destination);

  async function stop() {
    processor.disconnect();
    source.disconnect();
    stream.getTracks().forEach((track) => track.stop());
    await context.close();
  }

  return {
    stop,
    sampleRate: targetSampleRate
  };
}

export function createAudioPlayback({ sampleRate = DEFAULT_SAMPLE_RATE } = {}) {
  let context;
  try {
    context = new AudioContext({ sampleRate });
  } catch (error) {
    context = new AudioContext();
  }
  let nextTime = 0;

  function schedule(pcm16) {
    if (!pcm16 || pcm16.length === 0) return;
    const buffer = context.createBuffer(1, pcm16.length, sampleRate);
    const channel = buffer.getChannelData(0);
    channel.set(pcm16ToFloat32(pcm16));

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);

    if (nextTime < context.currentTime) {
      nextTime = context.currentTime;
    }
    source.start(nextTime);
    nextTime += buffer.duration;
  }

  async function resume() {
    if (context.state === 'suspended') {
      await context.resume();
    }
  }

  async function stop() {
    if (context.state !== 'closed') {
      await context.close();
    }
  }

  return {
    play: schedule,
    resume,
    stop
  };
}
