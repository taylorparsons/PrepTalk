import { describe, it, expect } from 'vitest';

describe('app entry', () => {
  it('mounts the voice layout when loaded', async () => {
    document.body.innerHTML = '<div id="app"></div>';

    await import('../../app/static/js/app.js');

    const root = document.getElementById('app');
    expect(root).not.toBeNull();
    expect(root.querySelector('.layout-split')).toBeTruthy();
  });
});
