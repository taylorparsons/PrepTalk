import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/dom';
import { createButton } from '../../app/static/js/components/button.js';

describe('createButton', () => {
  it('renders a button with a label', () => {
    const button = createButton({ label: 'Start interview' });
    document.body.appendChild(button);

    expect(screen.getByRole('button', { name: 'Start interview' })).toBe(button);
  });

  it('applies variant and size classes', () => {
    const button = createButton({ label: 'Save', variant: 'secondary', size: 'lg' });
    document.body.appendChild(button);

    expect(button.classList.contains('ui-button')).toBe(true);
    expect(button.classList.contains('ui-button--secondary')).toBe(true);
    expect(button.classList.contains('ui-button--lg')).toBe(true);
    expect(button.classList.contains('btn')).toBe(true);
    expect(button.classList.contains('btn-secondary')).toBe(true);
    expect(button.classList.contains('btn-lg')).toBe(true);
  });

  it('supports disabled and click handler', () => {
    const onClick = vi.fn();
    const button = createButton({ label: 'Stop', disabled: true, onClick });
    document.body.appendChild(button);

    expect(button.disabled).toBe(true);
    button.click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders an icon when provided', () => {
    const button = createButton({ label: 'Play', icon: 'play' });
    document.body.appendChild(button);

    const icon = button.querySelector('.ui-button__icon');
    expect(icon).not.toBeNull();
    expect(icon.textContent).toBe('play');
  });
});
