import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildVoiceLayout } from '../../app/static/js/ui.js';

describe('session tools drawer', () => {
  beforeEach(() => {
    window.__E2E__ = true;
  });

  afterEach(() => {
    delete window.__E2E__;
    delete window.__e2eState;
    delete window.__e2eUi;
    delete window.__APP_CONFIG__;
    document.body.innerHTML = '';
  });

  it('hides advanced controls by default', () => {
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    expect(layout.querySelector('[data-testid="barge-in-toggle"]')).toBeTruthy();
    expect(layout.querySelector('[data-testid="live-model-input"]')).toBeFalsy();
    expect(layout.querySelector('[data-testid="text-model-input"]')).toBeFalsy();
    expect(layout.querySelector('[data-testid="tts-model-input"]')).toBeFalsy();
    expect(layout.querySelector('[data-testid="voice-output-select"]')).toBeFalsy();
    expect(Array.from(layout.querySelectorAll('.ui-panel__title')).map((node) => node.textContent)).not.toContain('Live Stats');
    expect(layout.querySelector('[data-testid="custom-question-input"]')).toBeTruthy();
    expect(layout.querySelector('[data-testid="restart-interview"]')).toBeTruthy();
  });

  it('renders session tools controls and drawer', () => {
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    expect(layout.querySelector('[data-testid="mute-interview"]')).toBeTruthy();
    const ui = window.__e2eUi;
    expect(typeof ui.setSessionToolsOpen).toBe('function');

    const drawer = layout.querySelector('[data-testid="session-tools-drawer"]');
    expect(drawer).toBeTruthy();
    expect(drawer.getAttribute('aria-hidden')).toBe('true');
    expect(drawer.querySelector('[data-testid="session-select"]')).toBeTruthy();
    expect(drawer.querySelector('[data-testid="export-format"]')).toBeTruthy();
  });

  it('toggles the session tools drawer open and closed', () => {
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const ui = window.__e2eUi;
    const drawer = layout.querySelector('[data-testid="session-tools-drawer"]');

    ui.setSessionToolsOpen(true);
    expect(drawer.getAttribute('aria-hidden')).toBe('false');

    ui.setSessionToolsOpen(false);
    expect(drawer.getAttribute('aria-hidden')).toBe('true');
  });

  it('toggles mute state label', () => {
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const mute = layout.querySelector('[data-testid="mute-interview"]');
    expect(mute.textContent).toContain('Mute');

    mute.click();
    expect(mute.textContent).toContain('Unmute');
  });

  it('disables transcript export and restart by default', () => {
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const exportButton = layout.querySelector('[data-testid="export-transcript"]');
    const restartButton = layout.querySelector('[data-testid="restart-interview"]');
    const exportFormat = layout.querySelector('[data-testid="export-format"]');

    expect(exportButton.disabled).toBe(true);
    expect(exportButton.textContent).toContain('Export PDF');
    expect(exportFormat.value).toBe('pdf');
    expect(restartButton.disabled).toBe(true);
  });
});
