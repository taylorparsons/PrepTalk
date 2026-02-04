import { defineConfig } from '@playwright/test';

const e2eLiveRaw = (process.env.E2E_LIVE || '').trim().toLowerCase();
const isLive = e2eLiveRaw === '1' || e2eLiveRaw === 'true' || e2eLiveRaw === 'yes';
const adapter = isLive ? 'gemini' : 'mock';
const voiceMode = isLive ? (process.env.VOICE_MODE || 'live') : 'turn';
const launchOptions = isLive
  ? { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] }
  : {};
const port = process.env.E2E_PORT || '8129';
const baseURL = process.env.E2E_BASE_URL || `http://localhost:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  workers: isLive ? 1 : undefined,
  fullyParallel: !isLive,
  expect: {
    timeout: 10000
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'on',
    permissions: ['microphone'],
    launchOptions
  },
  webServer: {
    command: `INTERVIEW_ADAPTER=${adapter} VOICE_MODE=${voiceMode} RELOAD=0 PORT=${port} ./run.sh ui`,
    url: `${baseURL}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
});
