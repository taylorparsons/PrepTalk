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
    expect(layout.querySelector('.layout-split')).toBeTruthy();
    const titles = Array.from(layout.querySelectorAll('.ui-panel__title')).map((node) => node.textContent);

    expect(titles).toEqual(
      expect.arrayContaining([
        'Candidate Setup',
        'Session Controls',
        'Practice Topics',
        'Question Insights',
        'Transcript',
        'Session Insights'
      ])
    );
    expect(layout.querySelector('[data-testid="restart-interview-main"]')).toBeTruthy();
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

  it('enables candidate setup collapse after interview creation', () => {
    window.__E2E__ = true;
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const state = window.__e2eState;
    const ui = window.__e2eUi;

    expect(ui.setupCollapse.disabled).toBe(true);

    state.interviewId = 'abc-123';
    ui.updateSessionToolsState();

    expect(ui.setupCollapse.disabled).toBe(false);

    ui.setupCollapse.click();
    expect(ui.setupBody.hidden).toBe(true);

    ui.setupCollapse.click();
    expect(ui.setupBody.hidden).toBe(false);

    delete window.__E2E__;
    delete window.__e2eState;
    delete window.__e2eUi;
  });
});
