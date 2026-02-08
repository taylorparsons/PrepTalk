import { describe, it, expect, beforeEach } from 'vitest';
import { buildVoiceLayout, mountVoiceApp } from '../../app/static/js/ui.js';

describe('voice layout', () => {
  beforeEach(() => {
    delete window.__APP_CONFIG__;
    delete window.__E2E__;
    delete window.__e2eState;
    delete window.__e2eUi;
    document.body.innerHTML = '';
  });

  it('builds a responsive layout with key panels', () => {
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    expect(layout.classList.contains('layout-page')).toBe(true);
    expect(layout.querySelector('main.layout-stack')).toBeTruthy();
    const titles = Array.from(layout.querySelectorAll('.ui-panel__title')).map((node) => node.textContent);

    expect(titles).toEqual(
      expect.arrayContaining([
        'Candidate Setup',
        'Session Controls',
        'Interview Questions',
        'Question Insights',
        'Transcript',
        'Session Insights'
      ])
    );
    expect(layout.querySelector('[data-testid="restart-interview-main"]')).toBeTruthy();
  });

  it('places TTS provider control at the top of Extras drawer', () => {
    window.__E2E__ = true;
    window.__APP_CONFIG__ = { ttsProvider: 'openai' };
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const drawer = layout.querySelector('[data-testid="session-tools-drawer"]');
    expect(drawer).toBeTruthy();

    const sections = drawer.querySelectorAll('.ui-drawer__section');
    expect(sections.length).toBeGreaterThan(0);
    expect(sections[0].textContent).toContain('TTS provider');

    const providerSelect = drawer.querySelector('[data-testid="tts-provider-select"]');
    expect(providerSelect).toBeTruthy();
    expect(providerSelect.value).toBe('openai');

    providerSelect.value = 'gemini';
    providerSelect.dispatchEvent(new Event('change'));
    expect(window.__e2eState.ttsProvider).toBe('gemini');

    delete window.__E2E__;
    delete window.__e2eState;
    delete window.__e2eUi;
  });

  it('makes the interview questions panel vertically resizable', () => {
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const resizer = layout.querySelector('[data-testid="questions-resize"]');
    expect(resizer).toBeTruthy();
    expect(resizer.classList.contains('ui-questions__body')).toBe(true);
    expect(resizer.classList.contains('resize-y')).toBe(true);
    expect(resizer.classList.contains('overflow-auto')).toBe(true);
    expect(resizer.querySelector('[data-testid="question-list"]')).toBeTruthy();
  });

  it('makes the question insights panel vertically resizable', () => {
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const resizer = layout.querySelector('[data-testid="insights-resize"]');
    expect(resizer).toBeTruthy();
    expect(resizer.classList.contains('ui-insights__body')).toBe(true);
    expect(resizer.querySelector('[data-testid="insights-question"]')).toBeTruthy();

    const panel = layout.querySelector('[data-testid="question-insights-panel"]');
    expect(panel.classList.contains('resize-y')).toBe(true);
    expect(panel.classList.contains('overflow-auto')).toBe(true);
    const handle = layout.querySelector('[data-testid="insights-resize-handle"]');
    expect(handle).toBeTruthy();
    expect(handle.classList.contains('ui-resize-handle')).toBe(true);
  });

  it('keeps the candidate setup panel scrollable when tall', () => {
    window.__E2E__ = true;
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const ui = window.__e2eUi;
    expect(ui.setupBody.classList.contains('overflow-auto')).toBe(true);
    expect(ui.setupBody.classList.contains('max-h-screen')).toBe(true);

    delete window.__E2E__;
    delete window.__e2eState;
    delete window.__e2eUi;
  });

  it('interrupts coach speech in turn mode without errors', () => {
    window.__E2E__ = true;
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const state = window.__e2eState;
    const ui = window.__e2eUi;
    state.sessionActive = true;
    state.turnAwaitingAnswer = true;
    state.turnSpeaking = true;
    state.captionDraftText = 'Draft answer';
    ui.updateTurnSubmitUI();

    const interrupt = layout.querySelector('[data-testid="barge-in-toggle"]');
    const submit = layout.querySelector('[data-testid="submit-turn"]');

    expect(interrupt).toBeTruthy();
    expect(interrupt.disabled).toBe(false);
    expect(submit.disabled).toBe(true);

    interrupt.click();

    expect(state.turnSpeaking).toBe(false);
    expect(interrupt.disabled).toBe(true);
    expect(submit.disabled).toBe(false);

    delete window.__E2E__;
    delete window.__e2eState;
    delete window.__e2eUi;
  });

  it('only interrupts live mode when Interrupt is pressed', () => {
    window.__E2E__ = true;
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const state = window.__e2eState;
    const ui = window.__e2eUi;
    const interrupt = layout.querySelector('[data-testid="barge-in-toggle"]');

    let bargeCount = 0;
    state.transport = {
      bargeIn: () => {
        bargeCount += 1;
      }
    };
    state.audioPlayback = {
      stop: () => {}
    };
    state.voiceMode = 'live';
    state.sessionActive = true;
    ui.updateSessionToolsState();
    ui.updateTurnSubmitUI();

    expect(interrupt).toBeTruthy();
    expect(interrupt.disabled).toBe(false);

    layout.click();
    expect(bargeCount).toBe(0);

    interrupt.click();
    expect(bargeCount).toBe(1);

    delete window.__E2E__;
    delete window.__e2eState;
    delete window.__e2eUi;
  });

  it('shows Force TTS recovery only for live sessions with interview context', () => {
    window.__E2E__ = true;
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const state = window.__e2eState;
    const ui = window.__e2eUi;
    const forceTts = layout.querySelector('[data-testid="force-tts-recovery"]');

    expect(forceTts).toBeTruthy();
    expect(forceTts.hidden).toBe(true);

    state.interviewId = 'interview-live-1';
    state.questions = ['Tell me about yourself'];
    state.voiceMode = 'live';
    ui.updateSessionToolsState();
    expect(forceTts.hidden).toBe(false);
    expect(forceTts.disabled).toBe(false);

    state.voiceMode = 'turn';
    ui.updateSessionToolsState();
    expect(forceTts.hidden).toBe(true);

    delete window.__E2E__;
    delete window.__e2eState;
    delete window.__e2eUi;
  });

  it('mounts the layout into a root container', () => {
    const root = document.createElement('div');
    mountVoiceApp(root);

    expect(root.children.length).toBeGreaterThan(0);
    expect(root.querySelector('[data-testid="transcript-list"]')).toBeTruthy();
    expect(root.querySelector('[data-testid="voice-mode-select"]')).toBeFalsy();
    expect(root.querySelector('[data-testid="voice-mode-value"]')).toBeFalsy();
  });

  it('never renders live mode selectors even when uiDevMode is enabled', () => {
    window.__APP_CONFIG__ = { uiDevMode: true, voiceMode: 'live' };
    const root = document.createElement('div');
    mountVoiceApp(root);

    expect(root.querySelector('[data-testid="voice-mode-select"]')).toBeFalsy();
    expect(root.querySelector('[data-testid="voice-mode-value"]')).toBeFalsy();
    expect(root.querySelector('[data-testid="adapter-meta"]')).toBeFalsy();
  });

  it('renders question insights content for the first question', () => {
    window.__E2E__ = true;
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const state = window.__e2eState;
    const ui = window.__e2eUi;
    state.questions = ['Tell me about a project you led.'];
    state.focusAreas = [
      {
        area: 'Technical Depth in Distributed Systems & AI',
        description: 'Assess the ability to discuss architectural trade-offs.'
      }
    ];
    state.resumeExcerpt = 'Led a cross-functional team to launch X.\nImproved metrics by 25%.';
    state.jobExcerpt = 'Seeking a leader who can drive delivery.';

    ui.updateQuestionInsights(0, { clear: true });

    expect(ui.insightsQuestion.textContent).toContain('project you led');
    expect(ui.insightsPin.hidden).toBe(true);
    expect(ui.insightsFocus.textContent).toContain('Technical Depth in Distributed Systems & AI');
    expect(ui.insightsFocus.textContent).toContain('architectural trade-offs');

    delete window.__E2E__;
    delete window.__e2eState;
    delete window.__e2eUi;
  });

  it('toggles candidate setup visibility via state', () => {
    window.__E2E__ = true;
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const state = window.__e2eState;
    const ui = window.__e2eUi;

    expect(ui.setupPanel.hidden).toBe(false);

    state.hideSetup = true;
    ui.updateSessionToolsState();
    expect(ui.setupPanel.hidden).toBe(true);

    state.hideSetup = false;
    ui.updateSessionToolsState();
    expect(ui.setupPanel.hidden).toBe(false);

    delete window.__E2E__;
    delete window.__e2eState;
    delete window.__e2eUi;
  });

  it('updates the setup hint based on input readiness', () => {
    window.__E2E__ = true;
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const ui = window.__e2eUi;
    const hint = layout.querySelector('[data-testid="setup-hint"]');
    expect(hint).toBeTruthy();
    expect(hint.classList.contains('ui-state-text')).toBe(true);
    expect(hint.textContent).toContain('Add your resume');

    Object.defineProperty(ui.resumeInput, 'files', {
      value: [{ name: 'resume.pdf' }],
      configurable: true
    });
    ui.resumeInput.dispatchEvent(new Event('change'));
    expect(hint.textContent).toContain('job description');

    ui.jobUrlInput.value = 'https://example.com/job';
    ui.jobUrlInput.dispatchEvent(new Event('input'));
    expect(hint.textContent).toContain('Ready to generate');

    delete window.__E2E__;
    delete window.__e2eState;
    delete window.__e2eUi;
  });

  it('auto-collapses hero guidance when questions exist', () => {
    window.__E2E__ = true;
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const state = window.__e2eState;
    const ui = window.__e2eUi;

    expect(ui.heroBody.hidden).toBe(false);

    state.interviewId = 'abc-123';
    state.questions = ['Tell me about a time you led a project.'];
    ui.updateSessionToolsState();

    expect(ui.setupPanel.hidden).toBe(false);
    expect(ui.heroBody.hidden).toBe(true);

    ui.setHeroCollapsed(false);
    expect(ui.heroBody.hidden).toBe(false);

    delete window.__E2E__;
    delete window.__e2eState;
    delete window.__e2eUi;
  });

  it('hides transcript, score, and progress indicators until needed', () => {
    window.__E2E__ = true;
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const state = window.__e2eState;
    const ui = window.__e2eUi;

    expect(ui.controlsPanel.hidden).toBe(true);
    expect(ui.transcriptPanel.hidden).toBe(true);
    expect(ui.scorePanel.hidden).toBe(true);
    expect(ui.generateProgress.hidden).toBe(true);
    expect(ui.scoreProgress.hidden).toBe(true);
    expect(ui.generateProgress.classList.contains('ui-radial-progress--active')).toBe(false);
    expect(ui.scoreProgress.classList.contains('ui-radial-progress--active')).toBe(false);

    ui.setGenerateProgressVisible(true);
    expect(ui.generateProgress.hidden).toBe(false);
    expect(ui.generateProgress.classList.contains('ui-radial-progress--active')).toBe(true);
    ui.setGenerateProgressVisible(false);
    expect(ui.generateProgress.hidden).toBe(true);
    expect(ui.generateProgress.classList.contains('ui-radial-progress--active')).toBe(false);

    state.generateStarted = true;
    ui.updateSessionToolsState();
    expect(ui.controlsPanel.hidden).toBe(false);

    state.sessionActive = true;
    ui.updateSessionToolsState();
    expect(ui.transcriptPanel.hidden).toBe(false);

    state.scorePending = true;
    ui.updateSessionToolsState();
    expect(ui.scorePanel.hidden).toBe(false);
    expect(ui.scoreProgress.hidden).toBe(false);
    expect(ui.scoreProgress.classList.contains('ui-radial-progress--active')).toBe(true);

    delete window.__E2E__;
    delete window.__e2eState;
    delete window.__e2eUi;
  });

  it('primes audio on generate click before auto-start flow', async () => {
    window.__E2E__ = true;
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const state = window.__e2eState;
    const ui = window.__e2eUi;
    const generate = layout.querySelector('[data-testid="generate-questions"]');

    expect(state.audioPrimed).toBe(false);
    expect(generate.disabled).toBe(true);

    Object.defineProperty(ui.resumeInput, 'files', {
      value: [{ name: 'resume.pdf' }],
      configurable: true
    });
    Object.defineProperty(ui.jobInput, 'files', {
      value: [{ name: 'job.pdf' }],
      configurable: true
    });
    ui.resumeInput.dispatchEvent(new Event('change'));
    ui.jobInput.dispatchEvent(new Event('change'));
    expect(generate.disabled).toBe(false);

    generate.click();
    await Promise.resolve();
    expect(state.audioPrimed).toBe(true);

    delete window.__E2E__;
    delete window.__e2eState;
    delete window.__e2eUi;
  });

  it('moves transcript above questions when transcript exists', () => {
    window.__E2E__ = true;
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const state = window.__e2eState;
    const ui = window.__e2eUi;

    state.interviewId = 'abc-123';
    state.questions = ['Question 1'];
    state.transcript = [{ role: 'coach', text: 'Hello there.' }];
    ui.updateSessionToolsState();

    expect(ui.rightColumn.firstChild).toBe(ui.transcriptPanel);

    state.transcript = [];
    ui.updateSessionToolsState();
    expect(ui.rightColumn.firstChild).toBe(ui.questionRow);

    delete window.__E2E__;
    delete window.__e2eState;
    delete window.__e2eUi;
  });

  it('keeps Extras and Restart available after stop/results', () => {
    window.__E2E__ = true;
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const state = window.__e2eState;
    const ui = window.__e2eUi;

    state.interviewId = 'abc-123';
    state.questions = ['Question 1'];
    state.sessionStarted = true;
    state.sessionActive = false;
    state.scorePending = true;
    ui.updateSessionToolsState();

    expect(ui.controlsPanel.hidden).toBe(false);
    expect(ui.controlsPanel.classList.contains('ui-controls--results')).toBe(true);
    expect(ui.restartButtonMain.disabled).toBe(false);
    expect(typeof ui.setSessionToolsOpen).toBe('function');
    ui.setSessionToolsOpen(true);
    expect(ui.sessionToolsDrawer.classList.contains('ui-drawer--open')).toBe(true);

    delete window.__E2E__;
    delete window.__e2eState;
    delete window.__e2eUi;
  });

  it('persists help answers in question insights', () => {
    window.__E2E__ = true;
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const state = window.__e2eState;
    const ui = window.__e2eUi;
    state.questions = ['Tell me about a project you led.'];
    ui.updateQuestionInsights(0, { clear: true });

    expect(ui.insightsHelp.hidden).toBe(true);

    ui.applyHelpExample('Tell me about a project you led.', 'Use a STAR example with measurable impact.');

    expect(ui.insightsHelp.hidden).toBe(false);
    expect(ui.insightsHelp.textContent).toContain('STAR example');
    expect(ui.insightsPin.hidden).toBe(false);

    delete window.__E2E__;
    delete window.__e2eState;
    delete window.__e2eUi;
  });
});
