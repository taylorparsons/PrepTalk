import { describe, it, expect } from 'vitest';
import { buildVoiceLayout, mountVoiceApp } from '../../app/static/js/ui.js';

describe('voice layout', () => {
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
  });
});
