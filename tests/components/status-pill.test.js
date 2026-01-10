import { describe, it, expect } from 'vitest';
import { createStatusPill } from '../../app/static/js/components/status-pill.js';

describe('createStatusPill', () => {
  it('renders a pill with label and tone', () => {
    const pill = createStatusPill({ label: 'Connected', tone: 'success' });
    document.body.appendChild(pill);

    expect(pill.classList.contains('ui-pill')).toBe(true);
    expect(pill.classList.contains('ui-pill--success')).toBe(true);
    expect(pill.textContent).toContain('Connected');
  });

  it('renders an icon when provided', () => {
    const pill = createStatusPill({ label: 'Muted', tone: 'warning', icon: 'mute' });
    document.body.appendChild(pill);

    const icon = pill.querySelector('.ui-pill__icon');
    expect(icon).not.toBeNull();
    expect(icon.textContent).toBe('mute');
  });
});
