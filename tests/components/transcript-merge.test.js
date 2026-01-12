import { describe, it, expect } from 'vitest';
import { appendTranscriptEntry } from '../../app/static/js/ui.js';

describe('transcript merge', () => {
  it('merges same-role entries even when timestamps change', () => {
    const state = { transcript: [] };
    appendTranscriptEntry(state, { role: 'coach', text: 'I', timestamp: '19:01:41' });
    appendTranscriptEntry(state, { role: 'coach', text: 'am', timestamp: '19:01:42' });

    expect(state.transcript).toEqual([
      { role: 'coach', text: 'I am', timestamp: '19:01:41' }
    ]);
  });

  it('merges single-character continuation without a space', () => {
    const state = { transcript: [] };
    appendTranscriptEntry(state, { role: 'candidate', text: 'wha', timestamp: '19:01:41' });
    appendTranscriptEntry(state, { role: 'candidate', text: 't', timestamp: '19:01:41' });

    expect(state.transcript[0].text).toBe('what');
  });

  it('starts a new entry when the role changes', () => {
    const state = { transcript: [] };
    appendTranscriptEntry(state, { role: 'coach', text: 'Hello', timestamp: '19:01:41' });
    appendTranscriptEntry(state, { role: 'candidate', text: 'Hi', timestamp: '19:01:41' });
    appendTranscriptEntry(state, { role: 'candidate', text: 'there', timestamp: '19:01:42' });

    expect(state.transcript).toEqual([
      { role: 'coach', text: 'Hello', timestamp: '19:01:41' },
      { role: 'candidate', text: 'Hi there', timestamp: '19:01:41' }
    ]);
  });
});
