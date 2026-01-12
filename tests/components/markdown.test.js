import { describe, it, expect } from 'vitest';
import { renderMarkdownInto } from '../../app/static/js/markdown.js';

describe('markdown rendering', () => {
  it('renders markdown formatting', () => {
    const node = document.createElement('div');
    renderMarkdownInto(node, 'Hello **world** and *friends*');

    expect(node.querySelector('strong')?.textContent).toBe('world');
    expect(node.querySelector('em')?.textContent).toBe('friends');
  });

  it('sanitizes unsafe html', () => {
    const node = document.createElement('div');
    renderMarkdownInto(node, 'Safe text<script>alert(1)</script>');

    expect(node.querySelector('script')).toBeNull();
    expect(node.textContent).toContain('Safe text');
  });
});
