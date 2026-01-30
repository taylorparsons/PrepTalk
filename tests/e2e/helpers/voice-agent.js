export async function sendAudioBurst(
  page,
  {
    frames = 6,
    frequencyHz = 120,
    amplitude = 0.2,
    sampleRate = 24000
  } = {}
) {
  await page.evaluate(
    ({ frames: burstFrames, frequencyHz: burstFrequencyHz, amplitude: burstAmplitude, sampleRate: burstSampleRate }) => {
      const sendAudio = window.__e2eSendAudio;
      if (!sendAudio) return;
      const sendActivity = window.__e2eSendActivity;
      const frameSize = Math.round(burstSampleRate * 0.02);
      const maxAmplitude = 0x7fff;
      const safeAmplitude = Math.min(Math.max(burstAmplitude, 0), 1);
      sendActivity?.('start');
      for (let frameIndex = 0; frameIndex < burstFrames; frameIndex += 1) {
        const pcm = new Int16Array(frameSize);
        for (let i = 0; i < frameSize; i += 1) {
          const sample = Math.sin(2 * Math.PI * burstFrequencyHz * (i / burstSampleRate));
          pcm[i] = Math.round(sample * safeAmplitude * maxAmplitude);
        }
        sendAudio(pcm);
      }
      sendActivity?.('end');
    },
    {
      frames,
      frequencyHz,
      amplitude,
      sampleRate
    }
  );
}

export async function runVoiceAgent(
  page,
  {
    durationMs = 12000,
    pauseMs = 80,
    framesPerBurst = 6,
    frequencyHz = 120,
    amplitude = 0.2,
    sampleRate = 24000
  } = {}
) {
  const burstMs = framesPerBurst * 20;
  const cycleMs = Math.max(burstMs + pauseMs, burstMs);
  const cycles = Math.max(1, Math.floor(durationMs / cycleMs));

  for (let i = 0; i < cycles; i += 1) {
    await sendAudioBurst(page, {
      frames: framesPerBurst,
      frequencyHz,
      amplitude,
      sampleRate
    });
    if (pauseMs > 0) {
      await page.waitForTimeout(pauseMs);
    }
  }
}
