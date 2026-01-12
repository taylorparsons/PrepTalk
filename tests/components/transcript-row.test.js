import { describe, it, expect } from 'vitest';
import { createTranscriptRow } from '../../app/static/js/components/transcript-row.js';

describe('createTranscriptRow', () => {
  it('renders a coach transcript row with timestamp', () => {
    const row = createTranscriptRow({
      role: 'coach',
      text: 'Tell me about yourself.',
      timestamp: '10:04 AM'
    });
    document.body.appendChild(row);

    expect(row.classList.contains('ui-transcript__row')).toBe(true);
    expect(row.classList.contains('ui-transcript__row--coach')).toBe(true);
    expect(row.textContent).toContain('Tell me about yourself.');
    expect(row.textContent).toContain('10:04 AM');
  });

  it('marks candidate rows as final when requested', () => {
    const row = createTranscriptRow({
      role: 'candidate',
      text: 'I led the project.',
      isFinal: true
    });
    document.body.appendChild(row);

    expect(row.classList.contains('ui-transcript__row--candidate')).toBe(true);
    expect(row.dataset.state).toBe('final');
  });

  it('renders markdown formatting in transcript text', () => {
    const row = createTranscriptRow({
      role: 'coach',
      text: 'Use **metrics** in your answer.'
    });
    document.body.appendChild(row);

    expect(row.querySelector('strong')?.textContent).toBe('metrics');
  });
});
