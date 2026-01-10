import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/dom';
import { createIconButton } from '../../app/static/js/components/icon-button.js';

describe('createIconButton', () => {
  it('renders an icon-only button with an accessible label', () => {
    const button = createIconButton({ label: 'Settings', icon: 'gear' });
    document.body.appendChild(button);

    expect(screen.getByRole('button', { name: 'Settings' })).toBe(button);
  });

  it('applies variant and size classes', () => {
    const button = createIconButton({ label: 'Mute', icon: 'mute', variant: 'ghost', size: 'sm' });
    document.body.appendChild(button);

    expect(button.classList.contains('ui-icon-button')).toBe(true);
    expect(button.classList.contains('ui-icon-button--ghost')).toBe(true);
    expect(button.classList.contains('ui-icon-button--sm')).toBe(true);
  });

  it('calls the click handler when enabled', () => {
    const onClick = vi.fn();
    const button = createIconButton({ label: 'Play', icon: 'play', onClick });
    document.body.appendChild(button);

    button.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
