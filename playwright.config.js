import { defineConfig } from '@playwright/test';

const isLive = Boolean(process.env.E2E_LIVE);
const adapter = isLive ? 'gemini' : 'mock';
const launchOptions = isLive
  ? { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] }
  : {};

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  expect: {
    timeout: 10000
  },
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8000',
    trace: 'on-first-retry',
    permissions: ['microphone'],
    launchOptions
  },
  webServer: {
    command: `INTERVIEW_ADAPTER=${adapter} RELOAD=0 ./run.sh ui`,
    url: 'http://localhost:8000/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
});
