import { describe, it, expect, vi } from 'vitest';
import { normalizeQuestionStatuses, renderQuestions } from '../../app/static/js/ui.js';

describe('question status rendering', () => {
  it('renders status controls and classes', () => {
    const list = document.createElement('ul');
    const placeholder = document.createElement('li');
    const questions = ['Q1', 'Q2'];
    const statuses = normalizeQuestionStatuses(questions, [
      { status: 'started', updated_at: '2026-01-12' },
      { status: 'answered', updated_at: '2026-01-12' }
    ]);

    renderQuestions(list, questions, statuses, placeholder, () => {});

    const items = list.querySelectorAll('.ui-question');
    expect(items.length).toBe(2);
    expect(items[0].classList.contains('ui-question--started')).toBe(true);
    expect(items[1].classList.contains('ui-question--answered')).toBe(true);

    const select = items[0].querySelector('select');
    expect(select.value).toBe('started');
  });

  it('calls the status change handler', () => {
    const list = document.createElement('ul');
    const placeholder = document.createElement('li');
    const questions = ['Q1'];
    const statuses = normalizeQuestionStatuses(questions, []);
    const handler = vi.fn();

    renderQuestions(list, questions, statuses, placeholder, handler);

    const select = list.querySelector('select');
    select.value = 'answered';
    select.dispatchEvent(new Event('change'));

    expect(handler).toHaveBeenCalledWith(0, 'answered');
  });
});
