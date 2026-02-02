import { test, expect } from '@playwright/test';

const isLive = Boolean(process.env.E2E_LIVE);
const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
const isLong = Boolean(process.env.E2E_LIVE_LONG);
const liveDurationMs = Number.parseInt(process.env.E2E_LIVE_DURATION_MS || '180000', 10);
const livePollIntervalMs = Number.parseInt(process.env.E2E_LIVE_POLL_MS || '1000', 10);
const audioBurstFrames = Number.parseInt(process.env.E2E_LIVE_AUDIO_BURST_FRAMES || '6', 10);
const audioFrequencyHz = Number.parseFloat(process.env.E2E_LIVE_AUDIO_FREQUENCY_HZ || '440');
const audioAmplitude = Number.parseFloat(process.env.E2E_LIVE_AUDIO_AMPLITUDE || '0.2');

test.use({ trace: 'on' });

function buildPdfBuffer(label) {
  const content = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 12 Tf 72 720 Td (${label}) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000111 00000 n 
0000000212 00000 n 
trailer
<< /Root 1 0 R /Size 5 >>
startxref
312
%%EOF
`;
  return Buffer.from(content, 'utf-8');
}

async function sendAudioBurst(page, { frames, frequencyHz, amplitude }) {
  await page.evaluate(({ frames: burstFrames, frequencyHz: burstFrequencyHz, amplitude: burstAmplitude }) => {
    const sendAudio = window.__e2eSendAudio;
    if (!sendAudio) return;
    const sendActivity = window.__e2eSendActivity;
    const sampleRate = 24000;
    const frameSize = Math.round(sampleRate * 0.02);
    const maxAmplitude = 0x7fff;
    const safeAmplitude = Math.min(Math.max(burstAmplitude, 0), 1);
    sendActivity?.('start');
    for (let frameIndex = 0; frameIndex < burstFrames; frameIndex += 1) {
      const pcm = new Int16Array(frameSize);
      for (let i = 0; i < frameSize; i += 1) {
        const sample = Math.sin(2 * Math.PI * burstFrequencyHz * (i / sampleRate));
        pcm[i] = Math.round(sample * safeAmplitude * maxAmplitude);
      }
      sendAudio(pcm);
    }
    sendActivity?.('end');
  }, { frames, frequencyHz, amplitude });
}

test('candidate interview flow (gemini live long)', async ({ page }) => {
  test.skip(
    !isLive || !hasKey || !isLong,
    'Requires E2E_LIVE=1, E2E_LIVE_LONG=1, and GEMINI_API_KEY or GOOGLE_API_KEY.'
  );
  test.setTimeout(Math.max(240000, liveDurationMs + 60000));

  await page.addInitScript(() => {
    window.__E2E__ = true;
  });

  await page.goto('/');
  const voiceMode = await page.evaluate(() => window.__APP_CONFIG__?.voiceMode || 'live');
  test.skip(voiceMode === 'turn', 'Turn-based voice mode does not run live sessions.');

  const resumeBuffer = buildPdfBuffer('Resume');
  const jobBuffer = buildPdfBuffer('Job');

  await page.getByTestId('resume-file').setInputFiles({
    name: 'resume.pdf',
    mimeType: 'application/pdf',
    buffer: resumeBuffer
  });

  await page.getByTestId('job-file').setInputFiles({
    name: 'job.pdf',
    mimeType: 'application/pdf',
    buffer: jobBuffer
  });

  await page.getByTestId('generate-questions').click();
  await expect(page.getByTestId('start-interview')).toBeEnabled();

  await page.getByTestId('start-interview').click();
  await expect(page.getByTestId('session-status')).toHaveText('Live', { timeout: 60000 });
  await expect(page.getByTestId('stop-interview')).toBeEnabled();
  await page.waitForFunction(() => Boolean(window.__e2eSendAudio));

  const start = Date.now();
  while (Date.now() - start < liveDurationMs) {
    await sendAudioBurst(page, {
      frames: audioBurstFrames,
      frequencyHz: audioFrequencyHz,
      amplitude: audioAmplitude
    });
    const status = (await page.getByTestId('session-status').innerText()).trim();
    const stopEnabled = await page.getByTestId('stop-interview').isEnabled();
    if (!stopEnabled) {
      throw new Error(`Stop button disabled during live run (status: ${status}).`);
    }
    if (status === 'Live error' || status === 'Live ended' || status === 'Disconnected') {
      throw new Error(`Live session ended early (status: ${status}).`);
    }
    await page.waitForTimeout(livePollIntervalMs);
  }

  await expect.poll(
    () => page.evaluate(() => window.__e2eAudioChunks || 0),
    { timeout: 60000 }
  ).toBeGreaterThan(0);

  await page.getByTestId('stop-interview').click();
  await expect(page.getByTestId('score-value')).not.toHaveText('--');
});
