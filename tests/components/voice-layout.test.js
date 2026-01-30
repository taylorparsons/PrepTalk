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
        'Live Transcript',
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
    const modeValue = root.querySelector('[data-testid="voice-mode-value"]');
    expect(modeValue).toBeTruthy();
    expect(modeValue.textContent).toContain('Turn-based');
  });

  it('treats string uiDevMode values as false when set to 0', () => {
    window.__APP_CONFIG__ = { uiDevMode: '0', voiceMode: 'live' };
    const root = document.createElement('div');
    mountVoiceApp(root);

    expect(root.querySelector('[data-testid="voice-mode-select"]')).toBeFalsy();
    expect(root.querySelector('[data-testid="voice-mode-value"]')).toBeTruthy();
  });

  it('shows live streaming option in dev mode', () => {
    window.__APP_CONFIG__ = { uiDevMode: true, voiceMode: 'live' };
    const root = document.createElement('div');
    mountVoiceApp(root);

    const modeSelect = root.querySelector('[data-testid="voice-mode-select"]');
    expect(modeSelect).toBeTruthy();
    expect(Array.from(modeSelect.querySelectorAll('option')).map((opt) => opt.value)).toContain('live');
  });

  it('adds a dev mode label to the adapter meta line when enabled', () => {
    window.__APP_CONFIG__ = {
      uiDevMode: true,
      voiceMode: 'turn',
      adapter: 'gemini',
      voiceOutputMode: 'browser',
      textModel: 'gemini-3-flash-preview',
      ttsModel: 'gemini-2.5-flash-native-audio-preview-12-2025'
    };
    const root = document.createElement('div');
    mountVoiceApp(root);

    const meta = root.querySelector('[data-testid="adapter-meta"]');
    expect(meta).toBeTruthy();
    expect(meta.textContent).toContain('mode: Develop mode');
  });
});
