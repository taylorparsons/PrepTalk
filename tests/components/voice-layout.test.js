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
        'Interview Questions',
        'Question Insights',
        'Transcript',
        'Score Summary'
      ])
    );
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
    state.focusAreas = ['Leadership', 'Execution'];
    state.resumeExcerpt = 'Led a cross-functional team to launch X.\nImproved metrics by 25%.';
    state.jobExcerpt = 'Seeking a leader who can drive delivery.';

    ui.updateQuestionInsights(0, { clear: true });

    expect(ui.insightsQuestion.textContent).toContain('project you led');
    expect(ui.insightsPin.hidden).toBe(true);
    expect(ui.insightsFocus.textContent).toContain('Leadership');

    delete window.__E2E__;
    delete window.__e2eState;
    delete window.__e2eUi;
  });
});
