/**
 * AudioWorklet processor for microphone capture.
 * Runs on dedicated audio thread - zero main thread impact.
 *
 * @module audio-processor.worklet
 */

class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.targetSampleRate = options.processorOptions?.targetSampleRate || 24000;
    this.inputSampleRate = sampleRate; // Global in worklet scope
    this.buffer = [];
    // 60ms frames = fewer messages, better batching
    this.frameSize = Math.round((this.targetSampleRate * 60) / 1000);
    this.speechThreshold = options.processorOptions?.speechThreshold || 0.02;
    this.speaking = false;
    this.silenceFrames = 0;
    this.silenceHoldFrames = options.processorOptions?.silenceHoldFrames || 6;
  }

  /**
   * Downsample from input rate (typically 48kHz) to target rate (24kHz).
   * Uses simple averaging for quality.
   */
  downsample(input) {
    if (this.inputSampleRate === this.targetSampleRate) {
      return input;
    }

    const ratio = this.inputSampleRate / this.targetSampleRate;
    const outputLength = Math.round(input.length / ratio);
    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const start = Math.floor(i * ratio);
      const end = Math.min(Math.floor((i + 1) * ratio), input.length);
      let sum = 0;
      let count = 0;
      for (let j = start; j < end; j++) {
        sum += input[j];
        count++;
      }
      output[i] = count > 0 ? sum / count : 0;
    }
    return output;
  }

  /**
   * Convert Float32 samples to 16-bit PCM.
   */
  floatToPcm16(float32) {
    const pcm16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return pcm16;
  }

  /**
   * Detect speech activity using RMS energy.
   */
  detectSpeech(samples) {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sum / samples.length);

    if (rms >= this.speechThreshold) {
      this.silenceFrames = 0;
      if (!this.speaking) {
        this.speaking = true;
        this.port.postMessage({ type: 'speech_start' });
      }
    } else if (this.speaking) {
      this.silenceFrames++;
      if (this.silenceFrames >= this.silenceHoldFrames) {
        this.speaking = false;
        this.silenceFrames = 0;
        this.port.postMessage({ type: 'speech_end' });
      }
    }

    // Send activity state for UI updates
    this.port.postMessage({
      type: 'activity',
      speaking: this.speaking,
      level: rms
    });
  }

  /**
   * Process audio frames from microphone.
   * Called by browser at ~128 samples per call at input sample rate.
   */
  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input || input.length === 0) {
      return true;
    }

    // Downsample from input rate to target rate
    const downsampled = this.downsample(input);

    // Buffer samples until we have a full frame
    for (let i = 0; i < downsampled.length; i++) {
      this.buffer.push(downsampled[i]);
    }

    // When buffer has enough for a frame, process it
    while (this.buffer.length >= this.frameSize) {
      const frameData = this.buffer.splice(0, this.frameSize);
      const frame = new Float32Array(frameData);

      // Detect speech activity
      this.detectSpeech(frame);

      // Convert to PCM16 and send via transferable
      const pcm16 = this.floatToPcm16(frame);
      this.port.postMessage(
        { type: 'audio', buffer: pcm16.buffer },
        [pcm16.buffer] // Transfer ownership (zero-copy)
      );
    }

    return true; // Keep processor alive
  }
}

registerProcessor('audio-capture', AudioCaptureProcessor);
