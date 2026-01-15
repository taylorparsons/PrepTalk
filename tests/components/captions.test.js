import { describe, it, expect, beforeEach } from 'vitest';
import { buildVoiceLayout } from '../../app/static/js/ui.js';

describe('captions', () => {
  beforeEach(() => {
    window.__APP_CONFIG__ = { adapter: 'mock', liveModel: 'test' };
  });

  it('renders the caption panel with idle text', () => {
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    const label = document.querySelector('.ui-caption__label');
    const text = document.querySelector('.ui-caption__text');

    expect(label?.textContent).toBe('Live captions (local, en-US)');
    expect(text?.textContent).toBe('Captions idle.');
  });
});
