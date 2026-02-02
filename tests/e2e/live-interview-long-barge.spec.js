import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const isLive = Boolean(process.env.E2E_LIVE);
const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
const isBarge = Boolean(process.env.E2E_LIVE_LONG_BARGE);
const bargeDurationMs = Number.parseInt(process.env.E2E_LIVE_BARGE_DURATION_MS || '60000', 10);
const audioBurstFrames = Number.parseInt(process.env.E2E_LIVE_AUDIO_BURST_FRAMES || '6', 10);
const audioFrequencyHz = Number.parseFloat(process.env.E2E_LIVE_AUDIO_FREQUENCY_HZ || '440');
const audioAmplitude = Number.parseFloat(process.env.E2E_LIVE_AUDIO_AMPLITUDE || '0.2');
const logPath = process.env.E2E_LIVE_LOG_PATH
  || path.resolve(process.cwd(), 'logs/app.log');
const defaultBargeIntervalMs = Number.parseInt(
  process.env.E2E_LIVE_BARGE_INTERVAL_MS || '1000',
  10
);

test.use({ trace: 'on' });

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parseLogTimestamp(line) {
  const match = line.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}),(\d{3})/);
  if (!match) return null;
  const [, datePart, timePart, msPart] = match;
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);
  return Date.UTC(year, month - 1, day, hour, minute, second, Number(msPart));
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function estimateBargeIntervalMs(filePath, fallbackMs) {
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    const lines = text.trim().split('\n');
    const bargeLines = lines.filter((line) => (
      line.includes('event=gemini_live_barge_in')
      && line.includes('status=complete')
    ));
    const recent = bargeLines.slice(-50);
    const stamps = recent
      .map(parseLogTimestamp)
      .filter((stamp) => Number.isFinite(stamp));
    if (stamps.length < 2) return fallbackMs;
    const deltas = [];
    for (let i = 1; i < stamps.length; i += 1) {
      deltas.push(stamps[i] - stamps[i - 1]);
    }
    const estimated = median(deltas);
    if (!Number.isFinite(estimated)) return fallbackMs;
    return clamp(Math.round(estimated), 400, 2000);
  } catch (error) {
    return fallbackMs;
  }
}

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

test('candidate interview flow (gemini live long barge)', async ({ page, request }) => {
  test.skip(
    !isLive || !hasKey || !isBarge,
    'Requires E2E_LIVE=1, E2E_LIVE_LONG_BARGE=1, and GEMINI_API_KEY or GOOGLE_API_KEY.'
  );
  test.setTimeout(Math.max(180000, bargeDurationMs + 60000));

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

  const summaryBeforeResponse = await request.get('/api/logs/summary');
  expect(summaryBeforeResponse.ok()).toBeTruthy();
  const summaryBefore = await summaryBeforeResponse.json();
  const bargeCountBefore = summaryBefore?.event_counts?.gemini_live_barge_in || 0;

  const bargeIntervalMs = estimateBargeIntervalMs(logPath, defaultBargeIntervalMs);

  await page.getByTestId('start-interview').click();
  await expect(page.getByTestId('session-status')).toHaveText('Live', { timeout: 60000 });
  await expect(page.getByTestId('stop-interview')).toBeEnabled();
  await page.waitForFunction(() => Boolean(window.__e2eBargeIn));
  await page.waitForFunction(() => Boolean(window.__e2eSendAudio));

  const start = Date.now();
  while (Date.now() - start < bargeDurationMs) {
    await sendAudioBurst(page, {
      frames: audioBurstFrames,
      frequencyHz: audioFrequencyHz,
      amplitude: audioAmplitude
    });
    await page.evaluate(() => window.__e2eBargeIn?.());
    const status = (await page.getByTestId('session-status').innerText()).trim();
    const stopEnabled = await page.getByTestId('stop-interview').isEnabled();
    if (!stopEnabled) {
      throw new Error(`Stop button disabled during barge run (status: ${status}).`);
    }
    if (status === 'Live error' || status === 'Live ended' || status === 'Disconnected') {
      throw new Error(`Live session ended early (status: ${status}).`);
    }
    await page.waitForTimeout(bargeIntervalMs);
  }

  await page.getByTestId('stop-interview').click();
  await expect(page.getByTestId('score-value')).not.toHaveText('--');

  await expect.poll(
    () => page.evaluate(() => window.__e2eAudioChunks || 0),
    { timeout: 60000 }
  ).toBeGreaterThan(0);

  const summaryAfterResponse = await request.get('/api/logs/summary');
  expect(summaryAfterResponse.ok()).toBeTruthy();
  const summaryAfter = await summaryAfterResponse.json();
  const bargeCountAfter = summaryAfter?.event_counts?.gemini_live_barge_in || 0;

  expect(bargeCountAfter).toBeGreaterThan(bargeCountBefore);
});
