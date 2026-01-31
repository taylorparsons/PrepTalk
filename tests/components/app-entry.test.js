import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('app entry', () => {
  it('mounts the voice layout when loaded', async () => {
    document.body.innerHTML = '<div id="app"></div>';

    await import('../../app/static/js/app.js');

    const root = document.getElementById('app');
    expect(root).not.toBeNull();
    expect(root.querySelector('.layout-split')).toBeTruthy();
  });

  it('uses the PrepTalk title in the template', () => {
    const templatePath = path.resolve(process.cwd(), 'app/templates/index.html');
    const template = fs.readFileSync(templatePath, 'utf-8');
    expect(template).toContain('<title>PrepTalk Interview Coach</title>');
  });
});
