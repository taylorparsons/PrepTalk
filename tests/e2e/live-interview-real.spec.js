import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { runVoiceAgent } from './helpers/voice-agent.js';

const e2eLiveRaw = (process.env.E2E_LIVE || '').trim().toLowerCase();
const isLive = e2eLiveRaw === '1' || e2eLiveRaw === 'true' || e2eLiveRaw === 'yes';
const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
const resumePath = process.env.E2E_RESUME_PATH;
const jobPath = process.env.E2E_JOB_PATH;
const liveDurationMs = Number.parseInt(process.env.E2E_LIVE_REAL_DURATION_MS || '60000', 10);
const livePollIntervalMs = Number.parseInt(process.env.E2E_LIVE_POLL_MS || '1000', 10);
const audioBurstFrames = Number.parseInt(process.env.E2E_LIVE_AUDIO_BURST_FRAMES || '6', 10);
const audioFrequencyHz = Number.parseFloat(process.env.E2E_LIVE_MALE_FREQUENCY_HZ || '120');
const audioAmplitude = Number.parseFloat(process.env.E2E_LIVE_AUDIO_AMPLITUDE || '0.2');
const answerDurationMs = Number.parseInt(process.env.E2E_LIVE_REAL_ANSWER_MS || '12000', 10);
const answerPauseMs = Number.parseInt(process.env.E2E_LIVE_REAL_ANSWER_PAUSE_MS || '80', 10);
const warmupDurationMs = Number.parseInt(process.env.E2E_LIVE_REAL_WARMUP_MS || '1500', 10);

test.use({ trace: 'on' });

function hasFile(filePath) {
  return Boolean(filePath) && fs.existsSync(filePath);
}

function fileLabel(filePath) {
  return filePath ? path.basename(filePath) : 'unknown file';
}

test('candidate interview flow (gemini live real files)', async ({ page }) => {
  test.skip(!isLive || !hasKey, 'Requires E2E_LIVE=1 and GEMINI_API_KEY or GOOGLE_API_KEY.');
  test.skip(!hasFile(resumePath), `Missing E2E_RESUME_PATH file: ${fileLabel(resumePath)}`);
  test.skip(!hasFile(jobPath), `Missing E2E_JOB_PATH file: ${fileLabel(jobPath)}`);
  test.setTimeout(Math.max(180000, liveDurationMs + 60000));

  await page.addInitScript(() => {
    window.__E2E__ = true;
  });

  await page.goto('/');
  const voiceMode = await page.evaluate(() => window.__APP_CONFIG__?.voiceMode || 'live');
  test.skip(voiceMode === 'turn', 'Turn-based voice mode does not run live sessions.');

  const bargeToggle = page.getByTestId('barge-in-toggle');
  if ((await bargeToggle.getAttribute('aria-pressed')) === 'true') {
    await bargeToggle.click();
  }

  await page.getByTestId('resume-file').setInputFiles(resumePath);
  await page.getByTestId('job-file').setInputFiles(jobPath);

  await page.getByTestId('generate-questions').click();
  await expect(page.getByTestId('start-interview')).toBeEnabled({ timeout: 120000 });

  await page.getByTestId('start-interview').click();
  await expect(page.getByTestId('session-status')).toHaveText('Live', { timeout: 60000 });
  await expect(page.getByTestId('start-interview')).toBeEnabled();
  await page.waitForFunction(() => Boolean(window.__e2eSendAudio));

  await runVoiceAgent(page, {
    durationMs: warmupDurationMs,
    pauseMs: answerPauseMs,
    framesPerBurst: audioBurstFrames,
    frequencyHz: audioFrequencyHz,
    amplitude: audioAmplitude
  });

  await expect.poll(
    () => page.evaluate(() => (
      (document.querySelectorAll('.ui-transcript__row--coach').length > 0)
      || ((window.__e2eAudioChunks || 0) > 0)
    )),
    { timeout: 90000 }
  ).toBe(true);

  await runVoiceAgent(page, {
    durationMs: answerDurationMs,
    pauseMs: answerPauseMs,
    framesPerBurst: audioBurstFrames,
    frequencyHz: audioFrequencyHz,
    amplitude: audioAmplitude
  });

  const start = Date.now();
  while (Date.now() - start < liveDurationMs) {
    const status = (await page.getByTestId('session-status').innerText()).trim();
    const stopEnabled = await page.getByTestId('start-interview').isEnabled();
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

  await page.getByTestId('start-interview').click();
  await expect(page.getByTestId('score-value')).not.toHaveText('--');
});
