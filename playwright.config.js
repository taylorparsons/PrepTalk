import { defineConfig } from '@playwright/test';

const isLive = Boolean(process.env.E2E_LIVE);
const adapter = isLive ? 'gemini' : 'mock';
const launchOptions = isLive
  ? { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] }
  : {};
const port = process.env.E2E_PORT || '8129';
const baseURL = process.env.E2E_BASE_URL || `http://localhost:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
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
    command: `INTERVIEW_ADAPTER=${adapter} RELOAD=0 PORT=${port} ./run.sh ui`,
    url: `${baseURL}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
});
