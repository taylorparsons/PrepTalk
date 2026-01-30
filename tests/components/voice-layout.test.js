import { describe, it, expect, beforeEach } from 'vitest';
import { buildVoiceLayout, mountVoiceApp } from '../../app/static/js/ui.js';

describe('voice layout', () => {
  beforeEach(() => {
    delete window.__APP_CONFIG__;
    document.body.innerHTML = '';
  });

  it('builds a responsive layout with key panels', () => {
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    expect(layout.classList.contains('layout-split')).toBe(true);
    const titles = Array.from(layout.querySelectorAll('.ui-panel__title')).map((node) => node.textContent);

    expect(titles).toEqual(
      expect.arrayContaining([
        'Candidate Setup',
        'Session Controls',
        'Interview Questions',
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
});
