import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/dom';
import { createPanel } from '../../app/static/js/components/panel.js';

describe('createPanel', () => {
  it('renders title, subtitle, and content', () => {
    const panel = createPanel({
      title: 'Live session',
      subtitle: 'Microphone ready',
      content: 'Waiting for audio'
    });
    document.body.appendChild(panel);

    expect(screen.getByRole('heading', { name: 'Live session' })).toBeTruthy();
    expect(screen.getByText('Microphone ready')).toBeTruthy();
    expect(screen.getByText('Waiting for audio')).toBeTruthy();
  });

  it('renders footer content and variant class', () => {
    const footer = document.createElement('div');
    footer.textContent = 'Footer actions';

    const panel = createPanel({
      title: 'Summary',
      content: 'Session recap',
      footer,
      variant: 'elevated'
    });
    document.body.appendChild(panel);

    expect(panel.classList.contains('ui-panel--elevated')).toBe(true);
    expect(screen.getByText('Footer actions')).toBeTruthy();
  });
});
