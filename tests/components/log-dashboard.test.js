import { describe, it, expect, afterEach } from 'vitest';
import { formatCount, buildVoiceLayout } from '../../app/static/js/ui.js';

describe('log dashboard', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    delete window.__APP_CONFIG__;
  });

  it('formats undefined counts as 0', () => {
    expect(formatCount(undefined)).toBe('0');
  });

  it('does not render the live stats panel even when uiDevMode is true', () => {
    window.__APP_CONFIG__ = { uiDevMode: true };
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);
    expect(layout.querySelector('[data-testid="log-dashboard"]')).toBeFalsy();
  });
});
