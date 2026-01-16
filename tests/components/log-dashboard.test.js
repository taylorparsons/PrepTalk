import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatCount, buildVoiceLayout } from '../../app/static/js/ui.js';
import * as apiClient from '../../app/static/js/api/client.js';

describe('log dashboard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('formats undefined counts as 0', () => {
    expect(formatCount(undefined)).toBe('0');
  });

  it('updates metrics from log summary', async () => {
    const summary = {
      client_disconnects: 2,
      server_disconnects: 1,
      gemini_disconnects: 3,
      error_count: 4,
      error_event_count: 9,
      error_session_count: 5,
      event_counts: {
        ws_disconnect: 2,
        client_event: 3,
        gemini_live_receive: 1
      }
    };
    vi.spyOn(apiClient, 'getLogSummary').mockResolvedValue(summary);

    const layout = buildVoiceLayout();
    document.body.appendChild(layout);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const metricValue = (label) => {
      const labelNode = Array.from(layout.querySelectorAll('.ui-metric-card__label'))
        .find((node) => node.textContent === label);
      return labelNode?.closest('.ui-metric-card')
        ?.querySelector('.ui-metric-card__value')
        ?.textContent;
    };

    expect(metricValue('Client disconnects')).toBe('2');
    expect(metricValue('Server disconnects')).toBe('1');
    expect(metricValue('Gemini disconnects')).toBe('3');
    expect(metricValue('Errors')).toBe('9');
    expect(metricValue('Error sessions')).toBe('5');
    expect(layout.querySelectorAll('.ui-log-histogram__bar').length).toBeGreaterThan(0);
  });
});
