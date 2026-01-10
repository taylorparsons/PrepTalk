import { describe, it, expect } from 'vitest';
import { buildVoiceLayout, mountVoiceApp } from '../../app/static/js/ui.js';

describe('voice layout', () => {
  it('builds a responsive layout with key panels', () => {
    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    expect(layout.classList.contains('layout-split')).toBe(true);
    expect(layout.querySelector('.ui-panel__title')?.textContent).toContain('Session Controls');
    expect(layout.querySelectorAll('.ui-panel__title')[1]?.textContent).toContain('Live Transcript');
  });

  it('mounts the layout into a root container', () => {
    const root = document.createElement('div');
    mountVoiceApp(root);

    expect(root.children.length).toBeGreaterThan(0);
    expect(root.querySelector('.ui-transcript__row')).toBeTruthy();
  });
});
