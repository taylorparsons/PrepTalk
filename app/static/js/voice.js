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
