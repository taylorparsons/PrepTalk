import { test, expect } from '@playwright/test';
import zlib from 'node:zlib';

const e2eLiveRaw = (process.env.E2E_LIVE || '').trim().toLowerCase();
const isLive = e2eLiveRaw === '1' || e2eLiveRaw === 'true' || e2eLiveRaw === 'yes';
const accessToken = (process.env.E2E_ACCESS_TOKEN || '').trim();

const persona = {
  name: 'Avery Carter',
  answer:
    'I led a cross-functional launch across product, design, and engineering, cut delivery risk by clarifying ownership, and shipped on time with measurable adoption gains.'
};

const scenarios = [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'mobile', viewport: { width: 390, height: 844 } }
];

function withAccessToken(pathname) {
  if (!accessToken) return pathname;
  const separator = pathname.includes('?') ? '&' : '?';
  return `${pathname}${separator}access_token=${encodeURIComponent(accessToken)}`;
}

function buildPdfBuffer(label) {
  const content = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 72 720 Td (${label}) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000111 00000 n \n0000000212 00000 n \ntrailer\n<< /Root 1 0 R /Size 5 >>\nstartxref\n312\n%%EOF\n`;
  return Buffer.from(content, 'utf-8');
}

async function captureStep(page, testInfo, name) {
  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach(name, { body: screenshot, contentType: 'image/png' });
}

async function fetchStatus(page, path) {
  return page.evaluate(async (targetPath) => {
    const response = await fetch(targetPath, { credentials: 'include' });
    return response.status;
  }, withAccessToken(path));
}

function decodePdfStreams(buffer) {
  const binary = buffer.toString('binary');
  const streamPattern = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  let combined = '';
  while ((match = streamPattern.exec(binary)) !== null) {
    const chunk = Buffer.from(match[1], 'binary');
    try {
      combined += `${zlib.inflateSync(chunk).toString('latin1')}\n`;
    } catch {
      combined += `${chunk.toString('latin1')}\n`;
    }
  }
  return combined;
}

async function runFlow(page, testInfo, scenario) {
  const label = scenario.name;
  await page.setViewportSize(scenario.viewport);
  await page.addInitScript(() => {
    window.__E2E__ = true;
  });

  const route = accessToken ? `/?access_token=${encodeURIComponent(accessToken)}` : '/';
  await page.goto(route);

  const controlsPanel = page.getByTestId('controls-panel');
  const menuList = page.getByTestId('overflow-menu-list');
  await expect(controlsPanel).toBeHidden();
  await expect(menuList).toBeHidden();
  await captureStep(page, testInfo, `${label}-state-1-setup-empty`);

  await page.getByTestId('resume-file').setInputFiles({
    name: 'resume.pdf',
    mimeType: 'application/pdf',
    buffer: buildPdfBuffer(`Resume-${label}`)
  });
  await page.getByTestId('job-file').setInputFiles({
    name: 'job.pdf',
    mimeType: 'application/pdf',
    buffer: buildPdfBuffer(`Job-${label}`)
  });
  await captureStep(page, testInfo, `${label}-state-2-ready-to-generate`);

  await page.getByTestId('generate-questions').click();
  await expect(controlsPanel).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId('generate-progress')).toBeVisible({ timeout: 10000 });
  await captureStep(page, testInfo, `${label}-state-3-generating`);

  await expect
    .poll(async () => {
      const list = page.getByTestId('question-list');
      const itemCount = await list.locator('li').count();
      const text = (await list.textContent()) || '';
      const hasPlaceholder = /practice topics will appear after sharing your background/i.test(text);
      return itemCount > 0 && !hasPlaceholder;
    }, { timeout: 30000 })
    .toBe(true);
  await expect(page.getByTestId('session-status')).toHaveText(/Live|Listening|Welcoming|Ready|Disconnected/, { timeout: 60000 });
  await page.evaluate(() => {
    const root = document.scrollingElement;
    root?.scrollTo?.({ top: 0, behavior: 'auto' });
  });

  const stickyPositions = await page.evaluate(() => {
    const header = document.querySelector('.ui-hero__header');
    const controls = document.querySelector('[data-testid="controls-panel"]');
    return {
      header: header ? getComputedStyle(header).position : '',
      controls: controls ? getComputedStyle(controls).position : ''
    };
  });
  expect(stickyPositions.header).toBe('sticky');
  if (label === 'desktop') {
    expect(stickyPositions.controls).toBe('sticky');
  } else {
    expect(['static', 'relative']).toContain(stickyPositions.controls);
  }

  const topAnchoring = await page.evaluate(() => {
    const header = document.querySelector('.ui-hero__header');
    const controls = document.querySelector('[data-testid="controls-panel"]');
    if (!header || !controls) {
      return { gap: Number.POSITIVE_INFINITY, controlsTop: Number.POSITIVE_INFINITY };
    }
    const headerBottom = header.getBoundingClientRect().bottom;
    const controlsTop = controls.getBoundingClientRect().top;
    return {
      gap: Math.round(controlsTop - headerBottom),
      controlsTop: Math.round(controlsTop)
    };
  });
  if (label === 'desktop') {
    expect(topAnchoring.gap).toBeLessThan(24);
    expect(topAnchoring.controlsTop).toBeLessThan(140);
  } else {
    expect(topAnchoring.gap).toBeGreaterThanOrEqual(0);
  }
  await captureStep(page, testInfo, `${label}-state-4-questions-ready`);

  const menuToggle = page.getByTestId('overflow-menu-toggle');
  await menuToggle.click();
  const hideCandidate = page.getByRole('menuitem', { name: 'Hide Candidate Setup' });
  await expect(hideCandidate).toBeVisible();
  await hideCandidate.click();
  await expect(page.getByTestId('setup-panel')).toBeHidden();

  await menuToggle.click();
  const showCandidate = page.getByRole('menuitem', { name: 'Show Candidate Setup' });
  await expect(showCandidate).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Hide Candidate Setup' })).toHaveCount(0);
  await showCandidate.click();
  await expect(page.getByTestId('setup-panel')).toBeVisible();

  const personaAnswer = `${persona.name}: ${persona.answer}`;
  await page.evaluate((answer) => {
    const state = window.__e2eState || {};
    const ui = window.__e2eUi || {};
    const now = new Date().toISOString();
    window.__e2eHandleTranscript?.({
      role: 'candidate',
      text: answer,
      timestamp: now
    });
    window.__e2eHandleTranscript?.({
      role: 'coach',
      text: 'Thanks for the answer. I will align this to the role and rubric.',
      timestamp: now
    });
    state.sessionActive = true;
    state.turnAwaitingAnswer = true;
    state.turnSpeaking = false;
    state.captionDraftText = '';
    ui.updateTurnSubmitUI?.();
  }, personaAnswer);
  await expect.poll(
    () => page.locator('.ui-transcript__row--candidate').count(),
    { timeout: 30000 }
  ).toBeGreaterThan(0);
  await expect(page.getByTestId('transcript-list')).toContainText(persona.name, { timeout: 30000 });
  await expect.poll(
    () => page.locator('.ui-transcript__row--coach').count(),
    { timeout: 30000 }
  ).toBeGreaterThan(0);
  const interviewId = await page.evaluate(() => window.__e2eState?.interviewId || '');
  expect(interviewId).not.toBe('');
  const questionText = await page.evaluate(() => {
    const state = window.__e2eState || {};
    const index = Number.isInteger(state.askedQuestionIndex) && state.askedQuestionIndex >= 0
      ? state.askedQuestionIndex
      : 0;
    return state.questions?.[index] || state.questions?.[0] || 'Tell me about yourself.';
  });
  const helpResponse = await page.request.post(withAccessToken('/api/voice/help'), {
    data: {
      interview_id: interviewId,
      question: questionText,
      answer: personaAnswer
    }
  });
  expect(helpResponse.status()).toBe(200);
  const helpPayload = await helpResponse.json();
  expect(helpPayload?.help?.role).toBe('coach_feedback');
  await page.evaluate((entry) => {
    window.__e2eHandleTranscript?.(entry);
  }, helpPayload.help);
  await expect
    .poll(() => page.locator('.ui-transcript__row--coach_feedback').count(), { timeout: 30000 })
    .toBeGreaterThan(0);
  await captureStep(page, testInfo, `${label}-state-5-persona-turn`);

  const scorePanel = page.getByTestId('score-panel');
  const enteredResults = await page.evaluate(async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const state = () => window.__e2eState || {};
    const ui = () => window.__e2eUi || {};
    const clickStart = () => ui().startButton?.click?.();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (!state().sessionActive) {
        clickStart();
        await wait(1500);
      }
      if (state().sessionActive) {
        clickStart();
        for (let i = 0; i < 30; i += 1) {
          if (state().sessionActive === false && state().scorePending === true) {
            return true;
          }
          await wait(250);
        }
      }
      await wait(600);
    }
    return false;
  });
  expect(enteredResults).toBe(true);
  await expect(scorePanel).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('session-status')).toHaveText(/Complete/, { timeout: 60000 });
  await expect(page.getByTestId('score-value')).not.toHaveText('--', { timeout: 30000 });
  await expect(page.getByTestId('restart-interview-main')).toBeEnabled();
  await expect(page.getByTestId('export-pdf-main')).toBeEnabled();
  await expect(page.getByTestId('export-txt-main')).toBeEnabled();

  const pdfStatus = await fetchStatus(page, `/api/interviews/${interviewId}/study-guide?format=pdf`);
  const txtStatus = await fetchStatus(page, `/api/interviews/${interviewId}/study-guide?format=txt`);
  const missingStatus = await fetchStatus(page, '/api/interviews/not-a-real-id/study-guide?format=pdf');
  expect([200, 500]).toContain(pdfStatus);
  expect(txtStatus).toBe(200);
  expect(missingStatus).toBe(404);

  const txtResponse = await page.request.get(withAccessToken(`/api/interviews/${interviewId}/study-guide?format=txt`));
  expect(txtResponse.status()).toBe(200);
  const txtBody = await txtResponse.text();
  expect(txtBody).toContain('Transcript');
  expect(txtBody).toContain('coach:');
  expect(txtBody).toContain('coach_feedback:');
  expect(txtBody).toContain('candidate:');

  const pdfResponse = await page.request.get(withAccessToken(`/api/interviews/${interviewId}/study-guide?format=pdf`));
  expect(pdfResponse.status()).toBe(200);
  const pdfBuffer = Buffer.from(await pdfResponse.body());
  const decodedPdfText = decodePdfStreams(pdfBuffer);
  expect(decodedPdfText).toContain('Transcript');
  expect(decodedPdfText).toContain('coach:');
  expect(decodedPdfText).toContain('coach_feedback:');
  expect(decodedPdfText).toContain('candidate:');
  await captureStep(page, testInfo, `${label}-state-6-results`);
}

test.describe.configure({ mode: 'serial' });

for (const scenario of scenarios) {
  test(`candidate interview flow end-to-end (${scenario.name})`, async ({ page }, testInfo) => {
    test.skip(isLive, 'Responsive end-to-end spec is for mock adapter mode.');
    test.setTimeout(180000);
    await runFlow(page, testInfo, scenario);
  });
}
