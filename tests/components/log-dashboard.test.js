import { describe, it, expect } from 'vitest';
import { formatCount } from '../../app/static/js/ui.js';

describe('log dashboard', () => {
  it('formats undefined counts as 0', () => {
    expect(formatCount(undefined)).toBe('0');
  });
});
