import { describe, it, expect } from 'vitest';
import { buildVoiceLayout } from '../../app/static/js/ui.js';

describe('session tools drawer', () => {
  it('renders session tools controls and drawer', () => {
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    expect(layout.querySelector('[data-testid="mute-interview"]')).toBeTruthy();
    expect(layout.querySelector('[data-testid="session-tools-toggle"]')).toBeTruthy();

    const drawer = layout.querySelector('[data-testid="session-tools-drawer"]');
    expect(drawer).toBeTruthy();
    expect(drawer.getAttribute('aria-hidden')).toBe('true');
    expect(drawer.querySelector('[data-testid="session-select"]')).toBeTruthy();
    expect(drawer.querySelector('[data-testid="export-format"]')).toBeTruthy();
  });

  it('toggles the session tools drawer open and closed', () => {
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const toggle = layout.querySelector('[data-testid="session-tools-toggle"]');
    const close = layout.querySelector('[data-testid="session-tools-close"]');
    const drawer = layout.querySelector('[data-testid="session-tools-drawer"]');

    toggle.click();
    expect(drawer.getAttribute('aria-hidden')).toBe('false');

    close.click();
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
