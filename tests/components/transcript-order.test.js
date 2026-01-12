import { describe, it, expect } from 'vitest';
import { renderTranscript } from '../../app/static/js/ui.js';

describe('transcript ordering', () => {
  it('renders newest entries first', () => {
    const list = document.createElement('div');
    renderTranscript(list, [
      { role: 'coach', text: 'First', timestamp: '00:01' },
      { role: 'candidate', text: 'Second', timestamp: '00:02' },
      { role: 'coach', text: 'Third', timestamp: '00:03' }
    ]);

    const rows = list.querySelectorAll('.ui-transcript__row');
    expect(rows[0].textContent).toContain('Third');
    expect(rows[rows.length - 1].textContent).toContain('First');
  });
});
