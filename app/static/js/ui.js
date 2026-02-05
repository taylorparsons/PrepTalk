import {
  createButton,
  createLearningCard,
  generateLearningContent,
  createPanel,
  createStatusPill,
  createTranscriptRow
} from './components/index.js';
import {
  addCustomQuestion,
  createInterview,
  downloadStudyGuide,
  getInterviewSummary,
  listSessions,
  logClientEvent,
  restartInterview,
  scoreInterview,
  sendVoiceHelp,
  sendVoiceFeedback,
  sendVoiceIntro,
  sendVoiceTurnCompletion,
  sendVoiceTurn,
  startLiveSession,
  updateQuestionStatus,
  updateSessionName
} from './api/client.js';
import { getAppConfig } from './config.js';
import { LiveTransport } from './transport.js';
import { createActivityDetector } from './audio-activity.js';
import { createAudioFrameBuffer, createAudioFrameFlusher } from './audio-buffer.js';
import { createAudioPlayback, decodePcm16Base64, startMicrophoneCapture } from './voice.js';
import { renderMarkdownInto } from './markdown.js';

// Adaptive config from preflight-audio.js
const getAdaptiveConfig = () => {
  const config = window.PREPTALK_AUDIO_CONFIG || {
    sampleRate: 24000,
    frameSize: 60,
    bufferSize: 2048,
    profile: 'fallback'
  };
  return config;
};

const STATUS_TONES = ['neutral', 'success', 'warning', 'danger', 'info'];
const GEMINI_RECONNECT_MAX_ATTEMPTS = 3;
const GEMINI_RECONNECT_DELAY_MS = 600;
const AUDIO_FRAME_INTERVAL_MS = 20;
const AUDIO_BUFFER_WINDOW_MS = 1200;
const AUDIO_BUFFER_MAX_FRAMES = Math.ceil(AUDIO_BUFFER_WINDOW_MS / AUDIO_FRAME_INTERVAL_MS);
const AUDIO_ACTIVITY_SILENCE_MS = 500;
const AUDIO_ACTIVITY_THRESHOLD = 0.02;
const CAPTION_MAX_CHARS = 240;
const LIVE_COACH_SPEAK_DELAY_MS = 700;
const TURN_SUBMIT_COMMAND_PHRASES = ['submit my answer', 'how did i do'];
const TURN_HELP_COMMAND_PHRASES = ['help me', 'coach help', 'request help', 'help with this answer'];
const TURN_HELP_HINT_DELAY_MS = 12000;
const COACH_QUESTION_PATTERN = /\b(what|why|how|tell me|can you|could you|describe|walk me|give me|share|would you)\b/i;
const QUESTION_STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not started' },
  { value: 'started', label: 'Started' },
  { value: 'answered', label: 'Answered' }
];
const QUESTION_STATUS_LOOKUP = new Map(
  QUESTION_STATUS_OPTIONS.map((option) => [option.value, option.label])
);

const INSIGHT_STOPWORDS = new Set([
  'about',
  'after',
  'again',
  'also',
  'and',
  'any',
  'are',
  'been',
  'before',
  'can',
  'could',
  'describe',
  'did',
  'for',
  'from',
  'give',
  'have',
  'how',
  'into',
  'just',
  'like',
  'more',
  'most',
  'share',
  'should',
  'tell',
  'that',
  'the',
  'their',
  'them',
  'then',
  'this',
  'through',
  'was',
  'were',
  'what',
  'when',
  'where',
  'which',
  'why',
  'with',
  'would',
  'your',
  'you'
]);

function extractInsightKeywords(question) {
  const cleaned = String(question || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) {
    return [];
  }
  const tokens = cleaned.split(' ')
    .filter((token) => token.length > 3 && !INSIGHT_STOPWORDS.has(token));
  return Array.from(new Set(tokens)).slice(0, 8);
}

function splitExcerptLines(text) {
  return String(text || '')
    .split(/\r?\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 3);
}

function pickInsightLines(text, question, maxItems = 3) {
  const lines = splitExcerptLines(text);
  if (lines.length === 0) {
    return [];
  }
  const keywords = extractInsightKeywords(question);
  if (keywords.length === 0) {
    return lines.slice(0, maxItems);
  }
  const scored = lines.map((line) => {
    const lower = line.toLowerCase();
    let score = 0;
    keywords.forEach((token) => {
      if (lower.includes(token)) {
        score += 1;
      }
    });
    return { line, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const best = scored.filter((entry) => entry.score > 0).map((entry) => entry.line);
  const fallback = scored.map((entry) => entry.line);
  const selected = (best.length > 0 ? best : fallback).slice(0, maxItems);
  return Array.from(new Set(selected));
}

function buildQuestionRubric(question) {
  const text = String(question || '').toLowerCase();
  if (text.includes('tell me about yourself')) {
    return {
      why: 'They want a concise narrative that connects your background to the role.',
      rubric: [
        'Open with your current role or focus area.',
        'Highlight 2-3 experiences that match the job description.',
        'Close with why this role is the next step.'
      ]
    };
  }
  if (text.includes('why') && (text.includes('role') || text.includes('company') || text.includes('team'))) {
    return {
      why: 'They want to understand your motivation and role fit.',
      rubric: [
        'Reference a specific need from the job description.',
        'Connect your resume evidence to that need.',
        'Share what you want to learn or grow into here.'
      ]
    };
  }
  if (/(challenge|difficult|conflict|disagree|pushback)/.test(text)) {
    return {
      why: 'They are evaluating problem solving and how you handle tension.',
      rubric: [
        'Use STAR: situation, task, action, result.',
        'Emphasize the decision you made and why.',
        'Quantify the outcome if possible.'
      ]
    };
  }
  if (/(lead|leadership|manage|mentor|stakeholder)/.test(text)) {
    return {
      why: 'They want evidence of leadership and collaboration.',
      rubric: [
        'Name the team or partners involved.',
        'Highlight how you aligned people or drove decisions.',
        'Share the impact on delivery or outcomes.'
      ]
    };
  }
  if (/(design|architecture|system|technical|build|implement)/.test(text)) {
    return {
      why: 'They want to assess technical depth and decision making.',
      rubric: [
        'Frame the problem and constraints clearly.',
        'Explain the trade-offs you considered.',
        'Close with measurable impact or learnings.'
      ]
    };
  }
  return {
    why: 'They want evidence that your experience aligns with the role requirements.',
    rubric: [
      'Lead with a clear example from your resume.',
      'Focus on actions you took and the outcome.',
      'Tie your answer back to the job needs.'
    ]
  };
}

function buildQuestionRenderOptions(ui, state) {
  return {
    onHover: ui.onQuestionHover,
    onPin: ui.onQuestionPin,
    pinnedIndex: state.questionInsightsPinnedIndex
  };
}

function updateStatusPill(pill, { label, tone }) {
  const toneValue = STATUS_TONES.includes(tone) ? tone : 'neutral';
  pill.classList.forEach((className) => {
    if (className.startsWith('ui-pill--')) {
      pill.classList.remove(className);
    }
  });
  pill.classList.add(`ui-pill--${toneValue}`);
  const labelSpan = pill.querySelector('.ui-pill__label');
  if (labelSpan) {
    labelSpan.textContent = label;
  }
}

function updateButtonLabel(button, label) {
  const labelSpan = button.querySelector('.ui-button__label');
  if (labelSpan) {
    labelSpan.textContent = label;
  }
}

const BUTTON_VARIANTS = ['primary', 'secondary', 'ghost', 'danger'];

function setButtonVariant(button, variant) {
  if (!button) return;
  const normalized = BUTTON_VARIANTS.includes(variant) ? variant : 'primary';
  BUTTON_VARIANTS.forEach((value) => {
    button.classList.remove(`ui-button--${value}`);
  });
  button.classList.add(`ui-button--${normalized}`);
}

export function formatCount(value) {
  return typeof value === 'number' ? String(value) : '0';
}

export function formatScoreValue(value) {
  if (value === null || value === undefined) {
    return '--';
  }
  const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(numeric)) {
    return '--';
  }
  const display = Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
  return `${display} / 100`;
}

function coachHasQuestion(text) {
  const cleaned = String(text || '').trim();
  if (!cleaned) {
    return false;
  }
  if (cleaned.includes('?')) {
    return true;
  }
  return COACH_QUESTION_PATTERN.test(cleaned);
}

export function clearGeminiReconnect(state) {
  if (!state) return;
  if (state.geminiReconnectTimer) {
    clearTimeout(state.geminiReconnectTimer);
  }
  state.geminiReconnectTimer = null;
  state.geminiReconnectAttempts = 0;
}

export function scheduleGeminiReconnect(state, { statusPill } = {}) {
  if (!state?.sessionActive || !state.transport || !state.interviewId) {
    return false;
  }
  const attempts = state.geminiReconnectAttempts || 0;
  if (attempts >= GEMINI_RECONNECT_MAX_ATTEMPTS) {
    return false;
  }
  if (state.geminiReconnectTimer) {
    return true;
  }
  state.geminiReconnectAttempts = attempts + 1;
  if (statusPill) {
    updateStatusPill(statusPill, { label: 'Reconnecting', tone: 'warning' });
  }
  state.geminiReconnectTimer = setTimeout(() => {
    state.geminiReconnectTimer = null;
    if (!state.sessionActive || !state.transport || !state.interviewId) {
      return;
    }
    state.transport.start(state.interviewId, state.userId, { resume: true, liveModel: state.liveModel });
  }, GEMINI_RECONNECT_DELAY_MS);
  return true;
}

function ensureAudioBuffer(state) {
  if (!state) return;
  if (!state.audioFrameBuffer) {
    state.audioFrameBuffer = createAudioFrameBuffer({ maxFrames: AUDIO_BUFFER_MAX_FRAMES });
  }
  if (!state.audioFrameFlusher) {
    state.audioFrameFlusher = createAudioFrameFlusher({
      buffer: state.audioFrameBuffer,
      sendFrame: (frame) => {
        state.transport?.sendAudio(frame);
      },
      frameIntervalMs: AUDIO_FRAME_INTERVAL_MS,
      shouldSend: () => Boolean(state.transport) && state.geminiReady && !state.isMuted
    });
  }
}

function flushAudioBuffer(state) {
  if (!state?.audioFrameBuffer || !state?.audioFrameFlusher) return;
  if (state.audioFrameBuffer.size() === 0) return;
  state.audioFrameFlusher.start();
}

function stopAudioBuffer(state) {
  if (!state) return;
  state.audioFrameFlusher?.stop();
  state.audioFrameBuffer?.clear();
}

function sendClientEvent(state, event, { detail, status } = {}) {
  if (!state?.interviewId) return;
  const result = logClientEvent({
    event,
    interviewId: state.interviewId,
    sessionId: state.sessionId,
    state: status,
    detail
  });
  if (result && typeof result.catch === 'function') {
    result.catch(() => {
      // Best-effort telemetry; ignore failures.
    });
  }
}

function createFileField({ id, label, helpText, testId }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ui-field';

  const labelEl = document.createElement('label');
  labelEl.className = 'ui-field__label';
  labelEl.setAttribute('for', id);
  labelEl.textContent = label;

  const input = document.createElement('input');
  input.className = 'ui-field__input file-input file-input-bordered';
  input.type = 'file';
  input.accept = 'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,.pdf,.docx,.txt';
  input.id = id;
  input.setAttribute('data-testid', testId);

  const help = document.createElement('p');
  help.className = 'ui-field__help';
  help.textContent = helpText;

  wrapper.appendChild(labelEl);
  wrapper.appendChild(input);
  wrapper.appendChild(help);

  return { wrapper, input, help };
}

function createTextField({ id, label, helpText, placeholder, testId, type = 'text' }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ui-field';

  const labelEl = document.createElement('label');
  labelEl.className = 'ui-field__label';
  labelEl.setAttribute('for', id);
  labelEl.textContent = label;

  const input = document.createElement('input');
  input.className = 'ui-field__input input input-bordered';
  input.type = type;
  input.id = id;
  if (placeholder) {
    input.placeholder = placeholder;
  }
  input.setAttribute('data-testid', testId);

  const help = document.createElement('p');
  help.className = 'ui-field__help';
  help.textContent = helpText;

  wrapper.appendChild(labelEl);
  wrapper.appendChild(input);
  wrapper.appendChild(help);

  return { wrapper, input, help };
}

function mergeTranscriptText(previous, incoming) {
  const prev = previous || '';
  const next = (incoming || '').trim();
  if (!prev) return next;
  if (!next) return prev;
  const lastChar = prev.slice(-1);
  const startsWithPunct = /^[,.;:!?)]/.test(next);
  const startsWithQuote = /^['’]/.test(next);
  const isSingleCharContinuation = next.length === 1 && /[A-Za-z0-9]$/.test(prev);
  if (lastChar === '-' || startsWithPunct || startsWithQuote || isSingleCharContinuation) {
    return `${prev}${next}`;
  }
  if (prev.endsWith(' ')) {
    return `${prev}${next}`;
  }
  return `${prev} ${next}`;
}

function buildAppHeader(ui) {
  const wrapper = document.createElement('section');
  wrapper.className = 'ui-hero';

  const header = document.createElement('div');
  header.className = 'ui-hero__header';

  const heading = document.createElement('div');
  heading.className = 'ui-hero__heading';

  const eyebrow = document.createElement('div');
  eyebrow.className = 'ui-hero__eyebrow';
  eyebrow.textContent = 'PrepTalk • Your Interview Practice Coach';

  const title = document.createElement('h1');
  title.className = 'ui-hero__title';
  title.textContent = 'PrepTalk';

  const subtitle = document.createElement('p');
  subtitle.className = 'ui-hero__subtitle';
  subtitle.textContent = 'Build confidence with personalized practice topics drawn from your experience. Your coach will guide you through each answer, one step at a time.';

  heading.appendChild(eyebrow);
  heading.appendChild(title);
  heading.appendChild(subtitle);

  const toggle = createButton({
    label: 'Collapse guide',
    variant: 'ghost',
    size: 'sm',
    attrs: { 'data-testid': 'hero-collapse' }
  });
  toggle.classList.add('ui-hero__toggle');
  toggle.hidden = true;

  header.appendChild(heading);
  header.appendChild(toggle);

  const steps = document.createElement('ol');
  steps.className = 'ui-hero__steps';
  [
    'Upload your resume and job details (file or URL).',
    'Generate questions, then open Extras for optional actions.',
    'Start the coach, then use Help or Submit after the coach finishes speaking.'
  ].forEach((step) => {
    const li = document.createElement('li');
    li.textContent = step;
    steps.appendChild(li);
  });

  const note = document.createElement('div');
  note.className = 'ui-hero__note';
  note.textContent = 'Practice is turn-based. Help and Submit become active after the coach finishes speaking.';

  const callout = document.createElement('div');
  callout.className = 'ui-hero__callout';
  callout.textContent = 'Extras lets you revisit past sessions, add custom questions, and export study guides.';

  const body = document.createElement('div');
  body.className = 'ui-hero__body';
  body.appendChild(steps);
  body.appendChild(note);
  body.appendChild(callout);

  let isCollapsed = false;
  const setHeroCollapsed = (value) => {
    isCollapsed = Boolean(value);
    body.hidden = isCollapsed;
    wrapper.classList.toggle('ui-hero--collapsed', isCollapsed);
    updateButtonLabel(toggle, isCollapsed ? 'Expand guide' : 'Collapse guide');
  };

  toggle.addEventListener('click', () => {
    setHeroCollapsed(!isCollapsed);
  });

  wrapper.appendChild(header);
  wrapper.appendChild(body);

  if (ui) {
    ui.heroBody = body;
    ui.heroToggle = toggle;
    ui.setHeroCollapsed = setHeroCollapsed;
  }

  return wrapper;
}

export function appendTranscriptEntry(state, entry) {
  if (!state || !entry) return null;
  const text = (entry.text || '').trim();
  if (!text) return null;
  const transcript = Array.isArray(state.transcript) ? state.transcript : [];
  state.transcript = transcript;
  const last = transcript[transcript.length - 1];
  if (last && last.role === entry.role) {
    last.text = mergeTranscriptText(last.text || '', text);
    if (!last.timestamp && entry.timestamp) {
      last.timestamp = entry.timestamp;
    }
    return { entry: last, merged: true };
  }
  const nextEntry = {
    role: entry.role,
    text,
    timestamp: entry.timestamp
  };
  transcript.push(nextEntry);
  return { entry: nextEntry, merged: false };
}


function createListPlaceholder(text) {
  const item = document.createElement('li');
  item.className = 'ui-list__item';
  item.textContent = text;
  item.dataset.placeholder = 'true';
  return item;
}

function renderList(list, items, placeholder) {
  list.innerHTML = '';
  if (!items || items.length === 0) {
    list.appendChild(placeholder);
    return;
  }

  items.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'ui-list__item';
    li.textContent = item;
    li.dataset.index = String(index);
    list.appendChild(li);
  });
}

export function normalizeQuestionStatuses(questions, statuses) {
  const output = [];
  const input = Array.isArray(statuses) ? statuses : [];
  for (let i = 0; i < questions.length; i += 1) {
    const entry = input[i] || {};
    const status = QUESTION_STATUS_LOOKUP.has(entry.status) ? entry.status : 'not_started';
    output.push({
      status,
      updated_at: entry.updated_at || ''
    });
  }
  return output;
}

export function renderQuestions(list, questions, statuses, placeholder, onStatusChange, options = {}) {
  list.innerHTML = '';
  if (!questions || questions.length === 0) {
    list.appendChild(placeholder);
    return;
  }

  const { onHover, onPin, pinnedIndex } = options || {};

  questions.forEach((question, index) => {
    const statusEntry = statuses[index] || { status: 'not_started' };
    const statusValue = QUESTION_STATUS_LOOKUP.has(statusEntry.status)
      ? statusEntry.status
      : 'not_started';
    const isPinned = Number.isInteger(pinnedIndex) && pinnedIndex === index;

    const li = document.createElement('li');
    li.className = `ui-list__item ui-question ui-question--${statusValue}`;
    li.classList.toggle('ui-question--pinned', isPinned);
    li.dataset.index = String(index);
    li.tabIndex = 0;

    if (typeof onHover === 'function') {
      li.addEventListener('mouseenter', () => onHover(index));
      li.addEventListener('mouseleave', () => onHover(null));
      li.addEventListener('focus', () => onHover(index));
      li.addEventListener('blur', () => onHover(null));
    }

    const text = document.createElement('div');
    text.className = 'ui-question__text';
    text.textContent = question;

    const controls = document.createElement('div');
    controls.className = 'ui-question__controls';

    const pinButton = createButton({
      label: isPinned ? 'Pinned' : 'Pin',
      variant: 'ghost',
      size: 'sm',
      disabled: !onPin,
      attrs: {
        'data-testid': `question-pin-${index}`,
        'aria-pressed': String(isPinned),
        title: isPinned ? 'Unpin this question' : 'Pin this question'
      },
      onClick: (event) => {
        event.stopPropagation();
        onPin?.(index);
      }
    });
    pinButton.classList.add('ui-question__pin');

    const select = document.createElement('select');
    select.className = 'ui-question__select select select-bordered select-sm';
    select.setAttribute('data-testid', `question-status-${index}`);
    QUESTION_STATUS_OPTIONS.forEach((option) => {
      const opt = document.createElement('option');
      opt.value = option.value;
      opt.textContent = option.label;
      select.appendChild(opt);
    });
    select.value = statusValue;
    select.addEventListener('change', () => {
      onStatusChange?.(index, select.value);
    });

    controls.appendChild(pinButton);
    controls.appendChild(select);
    li.appendChild(text);
    li.appendChild(controls);
    list.appendChild(li);
  });
}

export function renderTranscript(list, entries) {
  list.innerHTML = '';
  if (!entries || entries.length === 0) {
    list.appendChild(
      createTranscriptRow({
        role: 'system',
        text: 'Waiting for session to start.',
        timestamp: ''
      })
    );
    list.scrollTop = 0;
    return;
  }

  const ordered = [...entries].reverse();
  ordered.forEach((entry) => {
    list.appendChild(
      createTranscriptRow({
        role: entry.role,
        text: entry.text,
        timestamp: entry.timestamp,
        isFinal: true
      })
    );
  });
  list.scrollTop = 0;
}

function renderScore(ui, score) {
  if (!score) {
    ui.scoreValue.textContent = '--';
    ui.scoreSummary.textContent = 'Complete a practice session to see your coaching feedback.';
    ui.scoreStrengths.innerHTML = '';
    ui.scoreImprovements.innerHTML = '';
    if (ui.scoreNotice) {
      ui.scoreNotice.textContent = 'Score will appear after you end the session.';
    }
    return;
  }

  ui.scoreValue.textContent = formatScoreValue(score.overall_score);
  renderMarkdownInto(ui.scoreSummary, score.summary || 'Summary pending.');

  ui.scoreStrengths.innerHTML = '';
  (score.strengths || []).forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    ui.scoreStrengths.appendChild(li);
  });

  ui.scoreImprovements.innerHTML = '';
  (score.improvements || []).forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    ui.scoreImprovements.appendChild(li);
  });

  if (ui.scoreNotice) {
    ui.scoreNotice.textContent = 'Score ready. Export PDF/TXT or restart when you are ready.';
  }
}

function coercePcm16(payload) {
  if (!payload) return null;
  if (payload instanceof Int16Array) return payload;
  if (payload instanceof ArrayBuffer) return new Int16Array(payload);
  if (payload.data && typeof payload.data === 'string') {
    return decodePcm16Base64(payload.data);
  }
  if (payload.pcm16 && payload.pcm16 instanceof ArrayBuffer) {
    return new Int16Array(payload.pcm16);
  }
  return null;
}

function buildSetupPanel(state, ui) {
  const resumeField = createFileField({
    id: 'resume-file',
    label: 'Resume (PDF)',
    helpText: 'Upload the candidate resume (PDF, DOCX, or TXT).',
    testId: 'resume-file'
  });

  const jobField = createFileField({
    id: 'job-file',
    label: 'Job Description (file)',
    helpText: 'Upload the role description (PDF, DOCX, or TXT). If a URL is reachable, it overrides this file.',
    testId: 'job-file'
  });

  const jobUrlField = createTextField({
    id: 'job-url',
    label: 'Job Description URL',
    helpText: 'Paste a public job posting URL (HTML, PDF, or DOCX). If reachable, it replaces the uploaded file.',
    placeholder: 'https://company.com/careers/role',
    testId: 'job-url',
    type: 'url'
  });

  const status = document.createElement('p');
  status.className = 'ui-field__help ui-state-text';
  status.textContent = 'Waiting for documents.';

  const setupHint = document.createElement('div');
  setupHint.className = 'ui-cta-hint ui-state-text alert alert-warning';
  setupHint.setAttribute('data-testid', 'setup-hint');
  setupHint.setAttribute('role', 'status');

  let isGenerating = false;

  const collapseButton = createButton({
    label: 'Collapse setup',
    variant: 'ghost',
    size: 'sm',
    disabled: true,
    attrs: { 'data-testid': 'setup-collapse' }
  });

  const generateButton = createButton({
    label: 'Generate Questions',
    variant: 'primary',
    size: 'md',
    disabled: true,
    attrs: { 'data-testid': 'generate-questions' }
  });

  const generateProgress = document.createElement('div');
  generateProgress.className = 'radial-progress ui-radial-progress ui-radial-progress--sm';
  generateProgress.style.setProperty('--ui-progress-value', '28');
  generateProgress.setAttribute('data-testid', 'generate-progress');
  generateProgress.setAttribute('role', 'status');
  generateProgress.setAttribute('aria-live', 'polite');
  generateProgress.setAttribute('aria-label', 'Generating questions');
  generateProgress.setAttribute('aria-hidden', 'true');
  generateProgress.hidden = true;

  function setGenerateProgressVisible(value) {
    const visible = Boolean(value);
    generateProgress.hidden = !visible;
    generateProgress.setAttribute('aria-hidden', String(!visible));
    generateProgress.classList.toggle('ui-radial-progress--active', visible);
  }

  function setSetupHintTone(tone) {
    setupHint.classList.remove('alert-info', 'alert-warning', 'alert-success');
    if (tone) {
      setupHint.classList.add(`alert-${tone}`);
    }
  }

  function updateSetupHint() {
    const resumeReady = resumeField.input.files.length > 0;
    const jobReady = jobField.input.files.length > 0
      || String(jobUrlField.input.value || '').trim().length > 0;
    const hasQuestions = Boolean(state.interviewId) && state.questions.length > 0;
    if (isGenerating) {
      setupHint.textContent = 'Generating questions...';
      setSetupHintTone('info');
      return;
    }
    if (hasQuestions) {
      setupHint.textContent = 'Questions ready. Start the session when you are ready.';
      setSetupHintTone('success');
      return;
    }
    if (!resumeReady && !jobReady) {
      setupHint.textContent = 'Add your resume and job details to enable Generate Questions.';
      setSetupHintTone('warning');
      return;
    }
    if (!resumeReady) {
      setupHint.textContent = 'Upload a resume to continue.';
      setSetupHintTone('warning');
      return;
    }
    if (!jobReady) {
      setupHint.textContent = 'Add a job description file or URL to continue.';
      setSetupHintTone('warning');
      return;
    }
    setupHint.textContent = 'Ready to generate questions.';
    setSetupHintTone('success');
  }

  function updateSetupCtas() {
    const hasQuestions = Boolean(state.interviewId) && state.questions.length > 0;
    setButtonVariant(generateButton, hasQuestions ? 'secondary' : 'primary');
    if (ui.startButton) {
      setButtonVariant(ui.startButton, hasQuestions ? 'primary' : 'secondary');
    }
    updateSetupHint();
  }

  function updateGenerateState() {
    const resumeReady = resumeField.input.files.length > 0;
    const jobReady = jobField.input.files.length > 0
      || String(jobUrlField.input.value || '').trim().length > 0;
    if (isGenerating) {
      generateButton.disabled = true;
      setGenerateProgressVisible(true);
      updateSetupHint();
      return;
    }
    setGenerateProgressVisible(false);
    generateButton.disabled = !(resumeReady && jobReady);
    ui.updateSetupCtas?.();
    updateSetupHint();
  }

  resumeField.input.addEventListener('change', updateGenerateState);
  jobField.input.addEventListener('change', updateGenerateState);
  jobUrlField.input.addEventListener('input', updateGenerateState);

  generateButton.addEventListener('click', async () => {
    if (generateButton.disabled) return;

    status.className = 'ui-field__help ui-state-text';
    status.textContent = 'Analyzing documents and generating questions...';
    generateButton.disabled = true;
    updateButtonLabel(generateButton, 'Generating...');
    isGenerating = true;
    setGenerateProgressVisible(true);
    updateSetupHint();
    state.interviewId = null;
    state.questions = [];
    state.questionStatuses = [];
    state.questionHelpExamples = [];
    state.transcript = [];
    state.score = null;
    state.scorePending = false;
    state.askedQuestionIndex = null;
    state.setupAutoCollapsed = false;
    state.heroAutoCollapsed = false;
    ui.startButton.disabled = true;
    renderQuestions(
      ui.questionList,
      state.questions,
      state.questionStatuses,
      ui.questionPlaceholder,
      ui.onQuestionStatusChange,
      buildQuestionRenderOptions(ui, state)
    );
    renderTranscript(ui.transcriptList, state.transcript);
    renderScore(ui, null);
    ui.updateSessionToolsState?.();

    try {
      const jobUrl = String(jobUrlField.input.value || '').trim();
      const result = await createInterview({
        resumeFile: resumeField.input.files[0],
        jobFile: jobField.input.files[0] || null,
        jobUrl: jobUrl || null
      });

      state.interviewId = result.interview_id;
      state.questions = result.questions || [];
      state.questionStatuses = normalizeQuestionStatuses(state.questions, result.question_statuses);
      state.adapter = result.adapter || state.adapter;
      state.focusAreas = result.focus_areas || [];
      state.resumeExcerpt = result.resume_excerpt || '';
      state.jobExcerpt = result.job_excerpt || '';
      state.sessionName = '';
      state.askedQuestionIndex = result.asked_question_index ?? null;
      state.sessionStarted = false;
      renderQuestions(
        ui.questionList,
        state.questions,
        state.questionStatuses,
        ui.questionPlaceholder,
        ui.onQuestionStatusChange,
        buildQuestionRenderOptions(ui, state)
      );
      ui.resetSessionState?.();
      ui.startButton.disabled = false;
      ui.updateSetupCtas?.();
      if (result.job_url_warning) {
        status.className = 'ui-field__warning ui-state-text';
        status.textContent = 'Questions ready. The job URL could not be reached, so we used the uploaded file.';
      } else {
        status.className = 'ui-field__help ui-state-text';
        status.textContent = 'Questions ready. Start the session when ready.';
      }
      ui.updateMeta?.();
      if (ui.sessionNameInput) {
        ui.sessionNameInput.value = '';
      }
      if (ui.customQuestionInput) {
        ui.customQuestionInput.value = '';
      }
      ui.updateSessionToolsState?.();
      ui.refreshSessionList?.();
      const defaultInsightIndex = state.questions.length > 0 ? 0 : null;
      ui.updateQuestionInsights?.(defaultInsightIndex, { clear: true });
    } catch (error) {
      status.className = 'ui-field__error ui-state-text';
      status.textContent = error.message || 'Unable to generate questions.';
    } finally {
      updateButtonLabel(generateButton, 'Generate Questions');
      isGenerating = false;
      setGenerateProgressVisible(false);
      updateGenerateState();
    }
  });

  const content = document.createElement('div');
  content.className = 'layout-stack overflow-auto max-h-screen';
  content.appendChild(resumeField.wrapper);
  content.appendChild(jobField.wrapper);
  content.appendChild(jobUrlField.wrapper);
  const generateRow = document.createElement('div');
  generateRow.className = 'ui-cta-row';
  generateRow.appendChild(generateButton);
  generateRow.appendChild(generateProgress);
  content.appendChild(generateRow);
  content.appendChild(setupHint);
  content.appendChild(status);

  ui.resumeInput = resumeField.input;
  ui.jobInput = jobField.input;
  ui.jobUrlInput = jobUrlField.input;
  ui.setupStatus = status;
  ui.setupHint = setupHint;
  ui.generateButton = generateButton;
  ui.generateProgress = generateProgress;
  ui.setGenerateProgressVisible = setGenerateProgressVisible;
  ui.updateSetupCtas = updateSetupCtas;
  updateSetupHint();

  const panel = createPanel({
    title: 'Candidate Setup',
    subtitle: 'Share your background to personalize the practice session.',
    content,
    attrs: { 'data-testid': 'setup-panel' }
  });
  const panelBody = panel.querySelector('.ui-panel__body');

  const header = panel.querySelector('.ui-panel__header');
  if (header) {
    header.classList.add('ui-panel__header--actions');
    const actions = document.createElement('div');
    actions.className = 'ui-panel__actions';
    actions.appendChild(collapseButton);
    header.appendChild(actions);
  }

  let setupCollapsed = false;
  function setSetupCollapsed(value) {
    setupCollapsed = value;
    content.hidden = setupCollapsed;
    if (panelBody) {
      panelBody.hidden = setupCollapsed;
    }
    panel.classList.toggle('ui-panel--collapsed', setupCollapsed);
    updateButtonLabel(collapseButton, setupCollapsed ? 'Expand setup' : 'Collapse setup');
  }

  collapseButton.addEventListener('click', () => {
    setSetupCollapsed(!setupCollapsed);
  });

  ui.setupCollapse = collapseButton;
  ui.setupBody = content;
  ui.setSetupCollapsed = setSetupCollapsed;
  ui.setupPanel = panel;

  return panel;
}

function buildControlsPanel(state, ui, config) {
  const statusPill = createStatusPill({
    label: 'Idle',
    tone: 'neutral',
    attrs: { 'data-testid': 'session-status', 'aria-live': 'polite', 'role': 'status' }
  });
  const startButton = createButton({
    label: 'Begin Practice',
    variant: 'primary',
    size: 'lg',
    disabled: true,
    attrs: { 'data-testid': 'start-interview' }
  });

  const stopButton = createButton({
    label: 'Stop Session',
    variant: 'ghost',
    size: 'md',
    disabled: true,
    attrs: { 'data-testid': 'stop-interview' }
  });

  const muteButton = createButton({
    label: 'Mute',
    variant: 'secondary',
    size: 'md',
    attrs: {
      'data-testid': 'mute-interview',
      'aria-pressed': 'false'
    },
    onClick: () => {
      setMuteState(!state.isMuted);
    }
  });

  const bargeInButton = createButton({
    label: 'Interrupt',
    variant: 'ghost',
    size: 'md',
    attrs: {
      'data-testid': 'barge-in-toggle',
      'aria-pressed': 'false'
    },
    onClick: () => {
      if (isTurnMode()) {
        interruptCoachSpeech();
        return;
      }
      setBargeInState(!state.bargeInEnabled);
    }
  });

  const submitTurnButton = createButton({
    label: 'Submit Answer',
    variant: 'primary',
    size: 'md',
    disabled: true,
    attrs: {
      'data-testid': 'submit-turn'
    },
    onClick: () => {
      submitTurnAnswer();
    }
  });

  const helpTurnButton = createButton({
    label: 'Request Help',
    variant: 'secondary',
    size: 'md',
    disabled: true,
    attrs: {
      'data-testid': 'help-turn'
    },
    onClick: () => {
      void requestTurnHelp({ source: 'button' });
    }
  });

  const sessionToolsButton = createButton({
    label: 'Extras',
    variant: 'ghost',
    size: 'sm',
    attrs: {
      'data-testid': 'session-tools-toggle',
      'aria-controls': 'session-tools-drawer',
      'aria-expanded': 'false'
    }
  });

  // Learning Mode toggle (teach-first coaching)
  const learningModeToggle = createButton({
    label: state.showExampleFirst ? 'Learning Mode: ON' : 'Learning Mode: OFF',
    variant: state.showExampleFirst ? 'primary' : 'ghost',
    size: 'sm',
    attrs: {
      'data-testid': 'learning-mode-toggle',
      'aria-pressed': String(state.showExampleFirst),
      'title': 'When ON, shows a resume-grounded example before each question'
    },
    onClick: () => {
      setLearningModePreference(!state.showExampleFirst);
      learningModeToggle.className = state.showExampleFirst
        ? 'ui-button ui-button--primary ui-button--sm'
        : 'ui-button ui-button--ghost ui-button--sm';
    }
  });
  ui.learningModeToggle = learningModeToggle;

  const restartMainLabel = document.createElement('div');
  restartMainLabel.className = 'ui-field__label';
  restartMainLabel.textContent = 'Restart Practice';

  const restartMainButton = createButton({
    label: 'Restart',
    variant: 'ghost',
    size: 'sm',
    disabled: true,
    attrs: { 'data-testid': 'restart-interview-main' }
  });

  const restartMainHelp = document.createElement('p');
  restartMainHelp.className = 'ui-field__help ui-state-text';
  restartMainHelp.textContent = 'Enabled after a session starts.';

  function setMuteState(isMuted) {
    state.isMuted = isMuted;
    updateButtonLabel(muteButton, isMuted ? 'Unmute' : 'Mute');
    muteButton.setAttribute('aria-pressed', String(isMuted));
    if (isTurnMode()) {
      if (isMuted) {
        stopSpeechRecognition();
      } else if (state.sessionActive) {
        startSpeechRecognition();
      }
    }
  }

  function setBargeInState(enabled) {
    state.bargeInEnabled = enabled;
    updateButtonLabel(bargeInButton, enabled ? 'Interrupt On' : 'Interrupt Off');
    bargeInButton.setAttribute('aria-pressed', String(enabled));
  }

  setBargeInState(state.bargeInEnabled);

  function voiceModeLabel() {
    return state.voiceMode === 'turn' ? 'Turn-based' : 'Live';
  }

  function normalizeVoiceOutputMode(value) {
    const cleaned = (value || '').trim().toLowerCase();
    if (cleaned === 'browser' || cleaned === 'server' || cleaned === 'auto') {
      return cleaned;
    }
    return 'auto';
  }

  function voiceOutputModeLabel() {
    const mode = normalizeVoiceOutputMode(state.voiceOutputMode);
    if (mode === 'browser') return 'Browser TTS';
    if (mode === 'server') return 'Server audio';
    return 'Auto';
  }

  function applyVoiceMode() {
    state.voiceMode = 'turn';
    updateMeta();
    updateTurnSubmitUI();
  }

  function applyVoiceOutputMode(value) {
    state.voiceOutputMode = normalizeVoiceOutputMode(value);
    if (state.voiceOutputMode === 'server') {
      cancelSpeechSynthesis();
      cancelLiveCoachSpeech();
    }
    updateMeta();
  }

  function updateMeta() {}

  function setCaptionText(text) {
    if (!ui.captionText) {
      return;
    }
    ui.captionText.textContent = text || 'Captions idle.';
  }

  function truncateCaption(text) {
    if (!text) {
      return '';
    }
    if (text.length <= CAPTION_MAX_CHARS) {
      return text;
    }
    return `...${text.slice(-CAPTION_MAX_CHARS)}`;
  }

  function isTurnMode() {
    return state.voiceMode === 'turn';
  }

  applyVoiceMode();
  applyVoiceOutputMode(state.voiceOutputMode);

  function getSpeechRecognitionClass() {
    return window.SpeechRecognition || window.webkitSpeechRecognition;
  }

  function scheduleSpeechRecognitionRestart() {
    if (state.speechRecognitionRestartTimer) {
      return;
    }
    state.speechRecognitionRestartTimer = window.setTimeout(() => {
      state.speechRecognitionRestartTimer = null;
      if (state.speechRecognitionEnabled) {
        startSpeechRecognition();
      }
    }, 250);
  }

  function resolveTurnCompletionMinMs() {
    const fallback = 10000;
    const raw = Number(state.turnEndDelayMs);
    if (!Number.isFinite(raw) || raw < 0) {
      return fallback;
    }
    return raw;
  }

  function resolveTurnCompletionConfidence() {
    const fallback = 0.9;
    const raw = Number(state.turnCompletionConfidence);
    if (!Number.isFinite(raw) || raw <= 0) {
      return fallback;
    }
    return raw;
  }

  function resolveTurnCompletionCooldownMs() {
    const fallback = 0;
    const raw = Number(state.turnCompletionCooldownMs);
    if (!Number.isFinite(raw) || raw < 0) {
      return fallback;
    }
    return raw;
  }

  function clearTurnCompletionTimer() {
    if (state.turnEndTimer) {
      clearTimeout(state.turnEndTimer);
      state.turnEndTimer = null;
    }
  }

  function normalizeTurnText(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[“”]/g, '"')
      .replace(/[’]/g, "'")
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function stripCommandSuffix(value, phrases = []) {
    const original = String(value || '').trim();
    if (!original) {
      return { text: '', command: null };
    }
    const lowered = normalizeTurnText(original);
    for (const phrase of phrases) {
      const normalizedPhrase = normalizeTurnText(phrase);
      if (!normalizedPhrase) continue;
      if (!lowered.endsWith(normalizedPhrase)) continue;
      const tokens = normalizedPhrase.split(' ').filter(Boolean).map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const phrasePattern = tokens.join('\\s+');
      const suffix = new RegExp(`(?:^|\\s)${phrasePattern}[?.!\\s]*$`, 'i');
      const cleaned = original.replace(suffix, '').trim();
      return { text: cleaned, command: phrase };
    }
    return { text: original, command: null };
  }

  function stripSubmitCommandSuffix(value) {
    return stripCommandSuffix(value, TURN_SUBMIT_COMMAND_PHRASES);
  }

  function stripHelpCommandSuffix(value) {
    return stripCommandSuffix(value, TURN_HELP_COMMAND_PHRASES);
  }

  function resolveCurrentQuestionText() {
    const lastQuestion = (state.lastCoachQuestion || '').trim();
    if (lastQuestion) {
      return lastQuestion;
    }
    if (Number.isInteger(state.askedQuestionIndex)) {
      const indexed = state.questions[state.askedQuestionIndex];
      if (indexed) {
        return indexed;
      }
    }
    return state.questions[0] || '';
  }

  function renderTurnRubric() {
    if (!ui.turnRubric || !ui.turnRubricList) {
      return;
    }
    const questionText = resolveCurrentQuestionText();
    if (!questionText) {
      ui.turnRubric.hidden = true;
      return;
    }
    const rubric = buildQuestionRubric(questionText);
    const items = Array.isArray(rubric.rubric) ? rubric.rubric.slice(0, 3) : [];
    ui.turnRubricList.innerHTML = '';
    items.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      ui.turnRubricList.appendChild(li);
    });
    ui.turnRubric.hidden = !state.turnRubricVisible;
  }

  function setTurnRubricVisible(value) {
    state.turnRubricVisible = value;
    renderTurnRubric();
  }

  function clearTurnHelpHintTimer() {
    if (state.turnHelpHintTimer) {
      clearTimeout(state.turnHelpHintTimer);
      state.turnHelpHintTimer = null;
    }
  }

  function resetTurnHelpHint() {
    clearTurnHelpHintTimer();
    state.turnHelpHintVisible = false;
  }

  function scheduleTurnHelpHint() {
    if (!isTurnMode() || !state.sessionActive || !state.turnAwaitingAnswer || state.turnSpeaking) {
      resetTurnHelpHint();
      return;
    }
    if (state.turnHelpHintTimer || state.turnHelpHintVisible) {
      return;
    }
    state.turnHelpHintTimer = window.setTimeout(() => {
      state.turnHelpHintTimer = null;
      const hasAnswer = String(state.captionDraftText || state.captionFinalText || '').trim().length > 0;
      if (!state.turnAwaitingAnswer || state.turnSpeaking || hasAnswer) {
        return;
      }
      state.turnHelpHintVisible = true;
      setTurnRubricVisible(true);
      updateTurnSubmitUI();
    }, TURN_HELP_HINT_DELAY_MS);
  }

  function updateTurnSubmitUI() {
    const showRow = isTurnMode() && state.sessionActive;
    if (ui.turnActionsRow) {
      ui.turnActionsRow.hidden = !showRow;
    }
    if (ui.turnHelp) {
      ui.turnHelp.hidden = !showRow;
    }
    if (bargeInButton) {
      if (isTurnMode()) {
        const canInterrupt = state.sessionActive && state.turnSpeaking;
        updateButtonLabel(bargeInButton, 'Interrupt');
        bargeInButton.disabled = !canInterrupt;
        bargeInButton.setAttribute('aria-disabled', String(!canInterrupt));
        bargeInButton.setAttribute('aria-pressed', 'false');
        bargeInButton.classList.toggle('ui-button--ready', canInterrupt);
        bargeInButton.title = canInterrupt
          ? 'Stop the coach and continue your answer.'
          : state.sessionActive
            ? 'Interrupt the coach when she is speaking.'
            : 'Start a session to enable interrupt.';
      } else {
        bargeInButton.disabled = false;
        bargeInButton.setAttribute('aria-disabled', 'false');
        bargeInButton.classList.remove('ui-button--ready');
        setBargeInState(state.bargeInEnabled);
      }
    }
    if (!ui.submitTurnButton) {
      return;
    }
    if (!showRow) {
      ui.submitTurnButton.disabled = true;
      if (ui.helpTurnButton) {
        ui.helpTurnButton.disabled = true;
      }
      ui.submitTurnButton.classList.remove('ui-button--ready');
      ui.helpTurnButton?.classList.remove('ui-button--ready');
      resetTurnHelpHint();
      setTurnRubricVisible(false);
      return;
    }
    const hasAnswer = String(state.captionDraftText || state.captionFinalText || '').trim().length > 0;
    const canInteract = state.turnAwaitingAnswer && !state.turnSpeaking;
    const canSubmit = canInteract && hasAnswer;
    const canHelp = canInteract && !state.turnHelpPending;

    ui.submitTurnButton.disabled = !canSubmit;
    ui.submitTurnButton.classList.toggle('ui-button--ready', canSubmit);
    ui.submitTurnButton.title = canSubmit
      ? 'Submit your answer and move on.'
      : state.turnSpeaking
        ? 'Wait for the coach to finish speaking.'
        : state.turnAwaitingAnswer
          ? 'Start answering to enable Submit.'
          : 'Waiting for the next coach question.';

    if (ui.helpTurnButton) {
      ui.helpTurnButton.disabled = !canHelp;
      ui.helpTurnButton.classList.toggle('ui-button--ready', canHelp);
      ui.helpTurnButton.title = canHelp
        ? 'Get a resume-grounded hint for this question.'
        : state.turnSpeaking
          ? 'Wait for the coach to finish speaking.'
          : state.turnAwaitingAnswer
            ? 'Help is on the way.' 
            : 'Help becomes available after the coach asks a question.';
    }

    if (ui.turnHelp) {
      if (hasAnswer && state.turnHelpHintVisible) {
        state.turnHelpHintVisible = false;
      }
      if (state.turnSpeaking) {
        ui.turnHelp.textContent = 'Coach is speaking. Wait to request help or submit your answer.';
      } else if (!state.turnAwaitingAnswer) {
        ui.turnHelp.textContent = 'Waiting for the next coach question.';
      } else if (state.turnHelpPending) {
        ui.turnHelp.textContent = 'Fetching help...';
      } else if (!hasAnswer && state.turnHelpHintVisible) {
        ui.turnHelp.textContent = 'Need a nudge? Use Request Help for a rubric-based tip.';
      } else if (!hasAnswer) {
        ui.turnHelp.textContent = 'Start answering to enable Submit. Help is available as soon as the coach finishes speaking.';
      } else {
        ui.turnHelp.textContent = 'Ready when you are. Request help or submit your answer.';
      }
      if (state.turnAwaitingAnswer && !state.turnSpeaking && !hasAnswer) {
        scheduleTurnHelpHint();
      } else {
        resetTurnHelpHint();
      }
    }
  }

  function submitTurnAnswer({ source = 'manual' } = {}) {
    if (!isTurnMode() || !state.sessionActive || !state.turnAwaitingAnswer) {
      return;
    }
    const stripped = stripSubmitCommandSuffix(state.captionDraftText || state.captionFinalText || '');
    const text = (stripped.text || '').trim();
    if (!text) {
      return;
    }
    sendClientEvent(state, 'turn_submit', { status: source });
    updateStatusPill(statusPill, { label: 'Thinking', tone: 'info' });
    state.turnAwaitingAnswer = false;
    state.turnReadyToSubmit = false;
    resetTurnHelpHint();
    setTurnRubricVisible(false);
    resetTurnCompletionTracking();
    stopSpeechRecognition();
    state.captionFinalText = '';
    state.captionDraftText = '';
    setCaptionText('Captions idle.');
    updateTurnSubmitUI();
    queueVoiceTurn(text);
  }

  function resetTurnCompletionTracking() {
    state.turnAnswerStartedAt = null;
    state.turnCompletionLastCheckAt = 0;
    state.turnCompletionPending = false;
    state.turnReadyToSubmit = false;
    state.captionDraftText = '';
    clearTurnCompletionTimer();
  }

  async function requestTurnCompletionCheck() {
    if (!isTurnMode() || !state.sessionActive || state.isMuted) {
      return;
    }
    if (state.turnCompletionPending) {
      return;
    }
    const question = (state.lastCoachQuestion || '').trim();
    const answer = String(state.captionDraftText || state.captionFinalText || '').trim();
    if (!question || !answer) {
      return;
    }
    state.turnCompletionPending = true;
    try {
      const response = await sendVoiceTurnCompletion({
        interviewId: state.interviewId,
        question,
        answer,
        textModel: state.textModel
      });
      state.turnCompletionLastCheckAt = Date.now();
      const confidence = Number(response?.confidence ?? 0);
      const attempted = Boolean(response?.attempted);
      if (attempted && confidence >= resolveTurnCompletionConfidence()) {
        state.turnReadyToSubmit = true;
        updateTurnSubmitUI();
        if (state.sessionActive && state.turnAwaitingAnswer) {
          updateStatusPill(statusPill, { label: 'Ready to submit', tone: 'warning' });
        }
      }
    } catch (error) {
      state.turnCompletionLastCheckAt = Date.now();
    } finally {
      state.turnCompletionPending = false;
    }
  }

  function scheduleTurnCompletionCheck() {
    if (!isTurnMode() || !state.sessionActive || state.isMuted || !state.turnAwaitingAnswer) {
      return;
    }
    const answer = String(state.captionDraftText || state.captionFinalText || '').trim();
    const question = (state.lastCoachQuestion || '').trim();
    if (!answer || !question) {
      return;
    }
    if (!state.turnAnswerStartedAt) {
      state.turnAnswerStartedAt = Date.now();
    }
    const now = Date.now();
    const minMs = resolveTurnCompletionMinMs();
    const elapsed = now - state.turnAnswerStartedAt;
    if (elapsed < minMs) {
      if (!state.turnEndTimer) {
        state.turnEndTimer = window.setTimeout(() => {
          state.turnEndTimer = null;
          scheduleTurnCompletionCheck();
        }, minMs - elapsed);
      }
      updateTurnSubmitUI();
      return;
    }

    if (!state.turnReadyToSubmit) {
      state.turnReadyToSubmit = true;
      updateTurnSubmitUI();
      if (state.sessionActive && state.turnAwaitingAnswer) {
        updateStatusPill(statusPill, { label: 'Ready to submit', tone: 'warning' });
      }
    }

    const cooldownMs = resolveTurnCompletionCooldownMs();
    if (state.turnCompletionPending) {
      return;
    }
    if (state.turnCompletionLastCheckAt && now - state.turnCompletionLastCheckAt < cooldownMs) {
      return;
    }
    void requestTurnCompletionCheck();
  }

  function ensureSpeechRecognition() {
    if (state.speechRecognition) {
      return state.speechRecognition;
    }
    const SpeechRecognition = getSpeechRecognitionClass();
    if (!SpeechRecognition) {
      setCaptionText('Captions unavailable in this browser.');
      return null;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result?.[0]?.transcript?.trim();
        if (!text) {
          continue;
        }
        if (result.isFinal) {
          finalText = mergeTranscriptText(finalText, text);
        } else {
          interimText = text;
        }
      }
      if (finalText) {
        const merged = mergeTranscriptText(state.captionFinalText || '', finalText);
        const helpStripped = stripHelpCommandSuffix(merged);
        if (helpStripped.command) {
          state.captionFinalText = helpStripped.text;
          updateTurnSubmitUI();
          void requestTurnHelp({
            answer: helpStripped.text,
            source: `voice_command:${normalizeTurnText(helpStripped.command).replace(/\s+/g, '_')}`
          });
          return;
        }
        const submitStripped = stripSubmitCommandSuffix(merged);
        state.captionFinalText = submitStripped.text;
        if (submitStripped.command) {
          state.turnReadyToSubmit = true;
          updateTurnSubmitUI();
          if ((submitStripped.text || '').trim().length > 0) {
            submitTurnAnswer({ source: `voice_command:${normalizeTurnText(submitStripped.command).replace(/\s+/g, '_')}` });
            return;
          }
        }
        scheduleTurnCompletionCheck();
      }
      const combined = mergeTranscriptText(state.captionFinalText || '', interimText);
      if (combined) {
        state.captionDraftText = combined;
        setCaptionText(truncateCaption(combined));
      }
    };

    recognition.onerror = (event) => {
      if (!state.speechRecognitionEnabled) {
        return;
      }
      const reason = event?.error ? ` (${event.error})` : '';
      setCaptionText(`Captions error${reason}.`);
    };

    recognition.onend = () => {
      state.speechRecognitionActive = false;
      if (state.speechRecognitionEnabled) {
        scheduleSpeechRecognitionRestart();
      }
    };

    state.speechRecognition = recognition;
    return recognition;
  }

  function startSpeechRecognition() {
    if (config.adapter === 'mock' && !isTurnMode()) {
      return;
    }
    const recognition = ensureSpeechRecognition();
    if (!recognition) {
      return;
    }
    if (state.speechRecognitionActive) {
      return;
    }
    state.speechRecognitionEnabled = true;
    try {
      recognition.start();
      state.speechRecognitionActive = true;
      if (ui.captionText?.textContent === 'Captions idle.') {
        setCaptionText('Captions listening...');
      }
    } catch (error) {
      setCaptionText('Captions failed to start.');
    }
  }

  function stopSpeechRecognition(options = {}) {
    const { preserveCaptions = false } = options || {};
    state.speechRecognitionEnabled = false;
    clearTurnCompletionTimer();
    if (state.speechRecognitionRestartTimer) {
      clearTimeout(state.speechRecognitionRestartTimer);
      state.speechRecognitionRestartTimer = null;
    }
    if (state.speechRecognition && state.speechRecognitionActive) {
      try {
        state.speechRecognition.stop();
      } catch (error) {
        // Ignore shutdown errors.
      }
    }
    state.speechRecognitionActive = false;
    if (!preserveCaptions) {
      state.captionFinalText = '';
      state.captionDraftText = '';
      setCaptionText('Captions idle.');
    }
  }

  function cancelSpeechSynthesis() {
    if (typeof state.turnAudioStop === 'function') {
      state.turnAudioStop();
    }
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      state.turnSpeaking = false;
      updateTurnSubmitUI();
      return;
    }
    window.speechSynthesis.cancel();
    state.turnSpeaking = false;
    updateTurnSubmitUI();
  }

  function interruptCoachSpeech() {
    if (!isTurnMode() || !state.sessionActive || !state.turnSpeaking) {
      return;
    }
    cancelSpeechSynthesis();
    if (state.sessionActive && !state.isMuted && !state.speechRecognitionActive) {
      startSpeechRecognition();
    }
  }

  function decodeBase64Audio(base64) {
    if (!base64 || typeof atob === 'undefined') {
      return null;
    }
    const binary = atob(base64);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      buffer[i] = binary.charCodeAt(i);
    }
    return buffer;
  }

  async function playCoachAudio(base64, mimeType, options = {}) {
    const audioBytes = decodeBase64Audio(base64);
    if (!audioBytes || audioBytes.length === 0 || typeof Audio === 'undefined') {
      return false;
    }
    const { preserveCaptions = false } = options || {};

    return new Promise((resolve) => {
      cancelSpeechSynthesis();
      state.turnSpeaking = true;
      updateTurnSubmitUI();
      stopSpeechRecognition({ preserveCaptions });

      const blob = new Blob([audioBytes], { type: mimeType || 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      let started = false;
      let finished = false;

      const finish = () => {
        if (finished) {
          return;
        }
        finished = true;
        audio.pause();
        audio.src = '';
        URL.revokeObjectURL(url);
        state.turnAudioStop = null;
        state.turnSpeaking = false;
        updateTurnSubmitUI();
        if (state.sessionActive && !state.isMuted) {
          startSpeechRecognition();
        }
        resolve(started);
      };

      audio.onended = finish;
      audio.onerror = finish;
      audio.onabort = finish;
      state.turnAudioStop = finish;
      audio.play()
        .then(() => {
          started = true;
        })
        .catch(() => {
          finish();
        });
    });
  }

  async function speakCoachReply(text, options = {}) {
    const reply = (text || '').trim();
    if (!reply) {
      return;
    }
    if (typeof window === 'undefined' || !window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      return;
    }
    const { restartRecognition = true, preserveCaptions = false } = options || {};
    return new Promise((resolve) => {
      cancelSpeechSynthesis();
      state.turnSpeaking = true;
      updateTurnSubmitUI();
      if (!preserveCaptions) {
        stopSpeechRecognition();
      } else {
        stopSpeechRecognition({ preserveCaptions: true });
      }
      const utterance = new SpeechSynthesisUtterance(reply);
      utterance.lang = state.voiceTtsLanguage || 'en-US';
      utterance.onend = () => {
        state.turnSpeaking = false;
        updateTurnSubmitUI();
        if (restartRecognition && state.sessionActive && !state.isMuted) {
          startSpeechRecognition();
        }
        resolve();
      };
      utterance.onerror = () => {
        state.turnSpeaking = false;
        updateTurnSubmitUI();
        if (restartRecognition && state.sessionActive && !state.isMuted) {
          startSpeechRecognition();
        }
        resolve();
      };
      window.speechSynthesis.speak(utterance);
    });
  }

  async function playCoachReply({ text, audio, audioMime, preserveCaptions = false } = {}) {
    const reply = (text || '').trim();
    const outputMode = normalizeVoiceOutputMode(state.voiceOutputMode);
    let played = false;
    const skipE2eTts = typeof window !== 'undefined' && window.__E2E__ && !window.__E2E_ALLOW_TTS;
    if (skipE2eTts && outputMode === 'browser') {
      return;
    }
    if (audio && outputMode !== 'browser') {
      played = await playCoachAudio(audio, audioMime, { preserveCaptions });
    }
    if (!played && reply) {
      await speakCoachReply(reply, { preserveCaptions });
    }
  }

  if (typeof window !== 'undefined' && window.__E2E__) {
    window.__e2ePlayCoachReply = playCoachReply;
  }

  function cancelLiveCoachSpeech() {
    if (state.liveCoachSpeakTimer) {
      clearTimeout(state.liveCoachSpeakTimer);
    }
    state.liveCoachSpeakTimer = null;
    state.liveCoachPendingText = '';
  }

  function shouldSpeakLiveCoach() {
    if (isTurnMode()) {
      return false;
    }
    const outputMode = normalizeVoiceOutputMode(state.voiceOutputMode);
    return outputMode === 'browser';
  }

  function scheduleLiveCoachSpeech(text) {
    if (!shouldSpeakLiveCoach()) {
      return;
    }
    const reply = (text || '').trim();
    if (!reply) {
      return;
    }
    if (state.liveCoachSpeakTimer) {
      clearTimeout(state.liveCoachSpeakTimer);
    }
    state.liveCoachPendingText = reply;
    state.liveCoachSpeakTimer = window.setTimeout(() => {
      state.liveCoachSpeakTimer = null;
      const pending = state.liveCoachPendingText;
      state.liveCoachPendingText = '';
      if (!pending || pending === state.lastSpokenCoachText) {
        return;
      }
      state.lastSpokenCoachText = pending;
      void speakCoachReply(pending);
    }, LIVE_COACH_SPEAK_DELAY_MS);
  }

  function handleTranscript(payload) {
    const result = appendTranscriptEntry(state, {
      role: payload.role,
      text: payload.text,
      timestamp: payload.timestamp
    });
    renderTranscript(ui.transcriptList, state.transcript);
    ui.autoStartNextQuestion?.(payload.role);
    ui.updateSessionToolsState?.();
    if (payload.role === 'coach' && !isTurnMode()) {
      const spokenText = result?.entry?.text || payload.text;
      scheduleLiveCoachSpeech(spokenText);
    }
  }

  function handleLiveAudio(payload) {
    const pcm16 = coercePcm16(payload);
    if (!pcm16 || pcm16.length === 0) {
      return;
    }
    const outputMode = normalizeVoiceOutputMode(state.voiceOutputMode);
    if (outputMode === 'browser') {
      if (typeof window !== 'undefined' && window.__E2E__) {
        window.__e2eAudioChunks = (window.__e2eAudioChunks || 0) + 1;
      }
      return;
    }
    state.liveAudioSeen = true;
    cancelLiveCoachSpeech();
    if (typeof window !== 'undefined' && window.__E2E__) {
      window.__e2eAudioChunks = (window.__e2eAudioChunks || 0) + 1;
    }
    const adaptiveConfig = getAdaptiveConfig();
    const sampleRate = payload?.sample_rate || adaptiveConfig.sampleRate;
    if (!state.audioPlayback || state.audioPlaybackSampleRate !== sampleRate) {
      state.audioPlayback?.stop();
      state.audioPlayback = createAudioPlayback({ sampleRate });
      state.audioPlaybackSampleRate = sampleRate;
      state.audioPlayback.resume();
    }
    state.audioPlayback.play(pcm16);
  }

  function ensureE2eCandidatePlayback(sampleRate) {
    const adaptiveConfig = getAdaptiveConfig();
    sampleRate = sampleRate || adaptiveConfig.sampleRate;
    if (!state.e2eCandidatePlayback || state.e2eCandidatePlaybackSampleRate !== sampleRate) {
      state.e2eCandidatePlayback?.stop();
      state.e2eCandidatePlayback = createAudioPlayback({ sampleRate });
      state.e2eCandidatePlaybackSampleRate = sampleRate;
      state.e2eCandidatePlayback.resume();
    }
    return state.e2eCandidatePlayback;
  }

  function stopE2eCandidatePlayback() {
    state.e2eCandidatePlayback?.stop();
    state.e2eCandidatePlayback = null;
    state.e2eCandidatePlaybackSampleRate = null;
  }

  ui.handleTranscript = handleTranscript;
  if (typeof window !== 'undefined' && window.__E2E__) {
    window.__e2eHandleTranscript = handleTranscript;
  }
  ui.handleLiveAudio = handleLiveAudio;
  if (typeof window !== 'undefined' && window.__E2E__) {
    window.__e2eHandleLiveAudio = handleLiveAudio;
  }

  function queueVoiceTurn(text) {
    const cleaned = (text || '').trim();
    if (!cleaned || !state.sessionActive || !state.interviewId || state.isMuted) {
      return;
    }
    state.turnQueue.push(cleaned);
    void processVoiceTurnQueue();
  }

  if (typeof window !== 'undefined' && window.__E2E__) {
    window.__e2eQueueTurn = (text) => queueVoiceTurn(text);
  }

  async function requestCoachFeedback({ question, answer } = {}) {
    if (!isTurnMode() || !state.sessionActive || !state.interviewId) {
      return;
    }
    const cleanedAnswer = (answer || '').trim();
    const cleanedQuestion = (question || '').trim();
    if (!cleanedAnswer || !cleanedQuestion) {
      return;
    }
    try {
      const response = await sendVoiceFeedback({
        interviewId: state.interviewId,
        question: cleanedQuestion,
        answer: cleanedAnswer,
        textModel: state.textModel
      });
      if (response?.feedback) {
        appendTranscriptEntry(state, response.feedback);
        renderTranscript(ui.transcriptList, state.transcript);
        ui.updateSessionToolsState?.();
      }
    } catch (error) {
      // Feedback is optional and should not disrupt the flow.
    }
  }

  async function requestTurnHelp({ question, answer, source = 'manual' } = {}) {
    if (!isTurnMode() || !state.sessionActive || !state.interviewId || state.turnSpeaking) {
      return;
    }
    if (!state.turnAwaitingAnswer) {
      return;
    }
    if (state.turnHelpPending) {
      return;
    }
    const cleanedQuestion = (question || state.lastCoachQuestion || '').trim();
    if (!cleanedQuestion) {
      return;
    }
    const cleanedAnswer = (answer || state.captionDraftText || state.captionFinalText || '').trim();
    state.turnHelpPending = true;
    resetTurnHelpHint();
    setTurnRubricVisible(true);
    updateTurnSubmitUI();
    sendClientEvent(state, 'turn_help', { status: source });
    updateStatusPill(statusPill, { label: 'Helping', tone: 'info' });
    try {
      const response = await sendVoiceHelp({
        interviewId: state.interviewId,
        question: cleanedQuestion,
        answer: cleanedAnswer || undefined,
        textModel: state.textModel,
        ttsModel: state.ttsModel
      });
      if (response?.help) {
        appendTranscriptEntry(state, response.help);
        renderTranscript(ui.transcriptList, state.transcript);
        ui.applyHelpExample?.(cleanedQuestion, response.help.text);
        ui.updateSessionToolsState?.();
        await playCoachReply({
          text: response.help.text,
          audio: response.help_audio,
          audioMime: response.help_audio_mime,
          preserveCaptions: true
        });
      }
    } catch (error) {
      updateStatusPill(statusPill, { label: 'Help error', tone: 'danger' });
    } finally {
      state.turnHelpPending = false;
      if (state.sessionActive && !state.turnSpeaking) {
        updateStatusPill(statusPill, { label: 'Listening', tone: 'info' });
      }
      updateTurnSubmitUI();
    }
  }

  async function processVoiceTurnQueue() {
    if (!state.sessionActive || state.turnRequestActive || state.turnSpeaking) {
      return;
    }
    const nextTurn = state.turnQueue.shift();
    if (!nextTurn) {
      return;
    }
    state.turnRequestActive = true;
    const questionForFeedback = state.lastCoachQuestion;
    updateStatusPill(statusPill, { label: 'Thinking', tone: 'info' });
    appendTranscriptEntry(state, {
      role: 'candidate',
      text: nextTurn,
      timestamp: new Date().toISOString()
    });
    renderTranscript(ui.transcriptList, state.transcript);
    ui.updateSessionToolsState?.();
    try {
      const response = await sendVoiceTurn({
        interviewId: state.interviewId,
        text: nextTurn,
        textModel: state.textModel,
        ttsModel: state.ttsModel
      });
      appendTranscriptEntry(state, response.coach);
      renderTranscript(ui.transcriptList, state.transcript);
      ui.autoStartNextQuestion?.(response.coach.role);
      ui.updateSessionToolsState?.();
      state.turnAwaitingAnswer = coachHasQuestion(response.coach.text);
      state.lastCoachQuestion = state.turnAwaitingAnswer ? response.coach.text : '';
      resetTurnHelpHint();
      setTurnRubricVisible(false);
      state.turnAwaitingStartedAt = state.turnAwaitingAnswer ? Date.now() : null;
      resetTurnCompletionTracking();
      updateTurnSubmitUI();
      await playCoachReply({
        text: response.coach.text,
        audio: response.coach_audio,
        audioMime: response.coach_audio_mime
      });
      void requestCoachFeedback({ question: questionForFeedback, answer: nextTurn });
    } catch (error) {
      updateStatusPill(statusPill, { label: 'Turn error', tone: 'danger' });
      state.turnQueue = [];
    } finally {
      state.turnRequestActive = false;
      if (state.sessionActive && !state.turnSpeaking) {
        updateStatusPill(statusPill, { label: 'Listening', tone: 'info' });
      }
      if (state.sessionActive) {
        void processVoiceTurnQueue();
      }
    }
  }

  async function startTurnIntro() {
    if (!state.sessionActive || !state.interviewId) {
      return;
    }
    updateStatusPill(statusPill, { label: 'Welcoming', tone: 'info' });
    state.turnAwaitingAnswer = false;
    try {
      const response = await sendVoiceIntro({
        interviewId: state.interviewId,
        textModel: state.textModel,
        ttsModel: state.ttsModel
      });
      appendTranscriptEntry(state, response.coach);
      renderTranscript(ui.transcriptList, state.transcript);
      ui.autoStartNextQuestion?.(response.coach.role);
      ui.updateSessionToolsState?.();
      state.turnAwaitingAnswer = coachHasQuestion(response.coach.text);
      state.lastCoachQuestion = state.turnAwaitingAnswer ? response.coach.text : '';
      resetTurnHelpHint();
      setTurnRubricVisible(false);
      state.turnAwaitingStartedAt = state.turnAwaitingAnswer ? Date.now() : null;
      resetTurnCompletionTracking();
      updateTurnSubmitUI();
      await playCoachReply({
        text: response.coach.text,
        audio: response.coach_audio,
        audioMime: response.coach_audio_mime
      });
    } catch (error) {
      updateStatusPill(statusPill, { label: 'Intro error', tone: 'danger' });
    } finally {
      if (state.sessionActive && !state.turnSpeaking) {
        updateStatusPill(statusPill, { label: 'Listening', tone: 'info' });
      }
      if (state.sessionActive && !state.speechRecognitionActive && !state.isMuted) {
        startSpeechRecognition();
      }
    }
  }

  function resetSessionState() {
    state.transcript = [];
    state.score = null;
    state.scorePending = false;
    state.sessionId = null;
    state.liveMode = null;
    state.sessionActive = false;
    state.geminiReady = false;
    state.activityDetector = null;
    stopSpeechRecognition();
    cancelSpeechSynthesis();
    state.captionFinalText = '';
    state.captionDraftText = '';
    state.turnReadyToSubmit = false;
    state.turnAwaitingAnswer = false;
    resetTurnCompletionTracking();
    cancelLiveCoachSpeech();
    state.turnQueue = [];
    state.turnRequestActive = false;
    state.turnHelpPending = false;
    state.turnSpeaking = false;
    resetTurnHelpHint();
    setTurnRubricVisible(false);
    cancelLiveCoachSpeech();
    state.liveAudioSeen = false;
    state.lastSpokenCoachText = '';
    state.lastCoachQuestion = '';
    state.setupAutoCollapsed = false;
    state.heroAutoCollapsed = false;
    clearGeminiReconnect(state);
    stopAudioBuffer(state);
    stopE2eCandidatePlayback();
    setMuteState(false);
    renderTranscript(ui.transcriptList, state.transcript);
    renderScore(ui, null);
    updateTurnSubmitUI();
    ui.updateSessionToolsState?.();
    ui.updateSetupCtas?.();
  }

  function resolveModelInput(input, fallback) {
    const raw = input?.value ?? '';
    const cleaned = raw.trim();
    return cleaned || fallback || '';
  }

  async function applyModelOverrides() {
    const nextLiveModel = resolveModelInput(ui.liveModelInput, state.liveModel || config.liveModel);
    const nextTextModel = resolveModelInput(ui.textModelInput, state.textModel || config.textModel);
    const nextTtsModel = resolveModelInput(ui.ttsModelInput, state.ttsModel || config.ttsModel);

    const liveChanged = nextLiveModel !== state.liveModel;
    const textChanged = nextTextModel !== state.textModel;
    const ttsChanged = nextTtsModel !== state.ttsModel;
    const needsRestart = state.sessionActive
      && ((state.voiceMode === 'live' && liveChanged)
        || (state.voiceMode === 'turn' && (textChanged || ttsChanged)));

    if (needsRestart) {
      await endLiveSession({ label: 'Model changed', tone: 'warning', allowRestart: true });
      resetSessionState();
    }

    state.liveModel = nextLiveModel;
    state.textModel = nextTextModel;
    state.ttsModel = nextTtsModel;

    if (ui.liveModelInput) {
      ui.liveModelInput.value = nextLiveModel;
    }
    if (ui.textModelInput) {
      ui.textModelInput.value = nextTextModel;
    }
    if (ui.ttsModelInput) {
      ui.ttsModelInput.value = nextTtsModel;
    }
    ui.updateMeta?.();
  }

  async function resetModelOverrides() {
    if (ui.liveModelInput) {
      ui.liveModelInput.value = config.liveModel || '';
    }
    if (ui.textModelInput) {
      ui.textModelInput.value = config.textModel || '';
    }
    if (ui.ttsModelInput) {
      ui.ttsModelInput.value = config.ttsModel || '';
    }
    await applyModelOverrides();
  }

  async function endLiveSession({ label, tone, allowRestart = false } = {}) {
    if (label && tone) {
      updateStatusPill(statusPill, { label, tone });
    }

    if (!state.sessionActive) {
      return;
    }

    state.sessionActive = false;
    state.geminiReady = false;
    clearGeminiReconnect(state);
    stopSpeechRecognition();
    cancelSpeechSynthesis();
    state.captionFinalText = '';
    state.captionDraftText = '';
    state.turnReadyToSubmit = false;
    state.turnAwaitingAnswer = false;
    resetTurnCompletionTracking();
    state.turnQueue = [];
    state.turnRequestActive = false;
    state.turnSpeaking = false;

    if (state.transport) {
      state.transport.stop();
      state.transport = null;
    }

    if (state.audioCapture) {
      await state.audioCapture.stop();
      state.audioCapture = null;
    }

    stopAudioBuffer(state);
    state.activityDetector = null;

    if (state.audioPlayback) {
      await state.audioPlayback.stop();
      state.audioPlayback = null;
      state.audioPlaybackSampleRate = null;
    }

    stopButton.disabled = true;
    startButton.disabled = !(allowRestart && state.interviewId);
    ui.updateSessionToolsState?.();
  }


  async function startMockFallback() {
    const live = await startLiveSession({ interviewId: state.interviewId });
    state.sessionId = live.session_id;
    state.liveMode = live.mode;
    updateStatusPill(statusPill, {
      label: live.mode === 'mock' ? 'Mock Live' : 'Live',
      tone: 'success'
    });

    if (live.mock_transcript?.length) {
      state.transcript = [];
      renderTranscript(ui.transcriptList, state.transcript);
      ui.updateSessionToolsState?.();
      const delay = config.adapter === 'mock' ? 120 : 220;
      live.mock_transcript.forEach((entry, index) => {
        window.setTimeout(() => {
          state.transcript.push(entry);
          renderTranscript(ui.transcriptList, state.transcript);
          ui.autoStartNextQuestion?.(entry.role);
          ui.updateSessionToolsState?.();
        }, delay * index);
      });
    }
  }

  async function ensureTransport() {
    if (!state.transport) {
      state.transport = new LiveTransport({
        onOpen: () => {
          updateStatusPill(statusPill, { label: 'Connected', tone: 'info' });
        },
        onClose: () => {
          if (state.sessionActive) {
            updateStatusPill(statusPill, { label: 'Disconnected', tone: 'warning' });
          }
          sendClientEvent(state, 'ws_close', { status: 'disconnected' });
        },
        onError: (payload) => {
          const message = typeof payload === 'string' ? payload : payload?.message;
          const label = message && message.length < 24 ? message : 'Connection error';
          sendClientEvent(state, 'ws_error', { detail: message, status: 'error' });
          if (state.sessionActive) {
            void endLiveSession({ label, tone: 'danger', allowRestart: true });
            return;
          }
          updateStatusPill(statusPill, { label, tone: 'danger' });
        },
        onSession: (payload) => {
          state.sessionId = payload.session_id;
          state.liveMode = payload.mode;
          if (payload.live_model) {
            state.liveModel = payload.live_model;
            if (ui.liveModelInput) {
              ui.liveModelInput.value = payload.live_model;
            }
            ui.updateMeta?.();
          }
          updateStatusPill(statusPill, {
            label: payload.mode === 'mock' ? 'Mock Live' : 'Live',
            tone: 'success'
          });
        },
        onStatus: (payload) => {
          if (payload.state === 'connected') {
            updateStatusPill(statusPill, { label: 'Connected', tone: 'info' });
          }
          if (payload.state === 'reconnecting') {
            updateStatusPill(statusPill, { label: 'Reconnecting', tone: 'warning' });
            sendClientEvent(state, 'ws_reconnecting', { status: payload.state });
          }
          if (payload.state === 'reconnected') {
            updateStatusPill(statusPill, { label: 'Reconnected', tone: 'info' });
            if (state.sessionActive && state.interviewId) {
              state.transport.start(state.interviewId, state.userId, { resume: true, liveModel: state.liveModel });
            }
            sendClientEvent(state, 'ws_reconnected', { status: payload.state });
          }
          if (payload.state === 'disconnected') {
            if (state.sessionActive) {
              void endLiveSession({ label: 'Disconnected', tone: 'warning', allowRestart: true });
              return;
            }
            updateStatusPill(statusPill, { label: 'Disconnected', tone: 'warning' });
            sendClientEvent(state, 'ws_disconnected', { status: payload.state });
          }
          if (payload.state === 'gemini-connected') {
            state.geminiReady = true;
            ensureAudioBuffer(state);
            flushAudioBuffer(state);
            clearGeminiReconnect(state);
            updateStatusPill(statusPill, { label: 'Live', tone: 'success' });
          }
          if (payload.state === 'thinking') {
            updateStatusPill(statusPill, { label: 'Thinking', tone: 'info' });
          }
          if (payload.state === 'gemini-error') {
            state.geminiReady = false;
            stopAudioBuffer(state);
            if (state.sessionActive) {
              void endLiveSession({ label: 'Live error', tone: 'danger', allowRestart: true });
            }
          }
          if (payload.state === 'gemini-disconnected') {
            state.geminiReady = false;
            stopAudioBuffer(state);
            if (state.sessionActive) {
              const scheduled = scheduleGeminiReconnect(state, { statusPill });
              if (!scheduled) {
                void endLiveSession({ label: 'Live ended', tone: 'warning', allowRestart: true });
              }
            }
            sendClientEvent(state, 'gemini_disconnected', { status: payload.state });
          }
          if (payload.state === 'stream-complete') {
            updateStatusPill(statusPill, { label: 'Stream complete', tone: 'success' });
          }
          if (payload.state === 'stopped') {
            updateStatusPill(statusPill, { label: 'Stopped', tone: 'warning' });
          }
        },
        onTranscript: (payload) => {
          handleTranscript(payload);
        },
        onAudio: (payload) => {
          handleLiveAudio(payload);
        }
      });
      if (typeof window !== 'undefined' && window.__E2E__) {
        // Expose minimal hooks for Playwright to trigger barge-in events.
        window.__liveTransport = state.transport;
        window.__e2eAudioChunks = 0;
        window.__e2eBargeIn = () => state.transport?.bargeIn();
        state.e2eCandidatePlaybackEnabled = true;
        window.__e2eSetCandidatePlayback = (enabled) => {
          state.e2eCandidatePlaybackEnabled = Boolean(enabled);
          if (!state.e2eCandidatePlaybackEnabled) {
            stopE2eCandidatePlayback();
          }
        };
        window.__e2eSendAudio = (pcm16) => {
          const payload = coercePcm16(pcm16);
          if (!payload || payload.length === 0) {
            return;
          }
          state.transport?.sendAudio(payload);
          if (state.e2eCandidatePlaybackEnabled) {
            ensureE2eCandidatePlayback().play(payload);
          }
        };
        window.__e2eSendActivity = (activityState) => state.transport?.send({
          type: 'activity',
          state: activityState
        });
      }
    }

    await state.transport.connect();
  }

  async function startMicrophoneIfNeeded() {
    if (config.adapter === 'mock') {
      return;
    }

    try {
      state.activityDetector = createActivityDetector({
        frameDurationMs: AUDIO_FRAME_INTERVAL_MS,
        silenceThreshold: AUDIO_ACTIVITY_THRESHOLD,
        silenceWindowMs: AUDIO_ACTIVITY_SILENCE_MS
      });
      const adaptiveConfig = getAdaptiveConfig();
      state.audioCapture = await startMicrophoneCapture({
        targetSampleRate: adaptiveConfig.sampleRate,
        onAudioFrame: (frame) => {
          if (state.isMuted) return;
          const activity = state.activityDetector?.update(frame);
          if (activity) {
            state.transport?.send({ type: 'activity', state: activity });
          }
          ensureAudioBuffer(state);
          if (!state.geminiReady || state.audioFrameFlusher?.isActive()) {
            state.audioFrameBuffer?.push(frame);
            return;
          }
          state.transport?.sendAudio(frame);
        },
        onSpeechStart: () => {
          if (!state.bargeInEnabled) {
            return;
          }
          if (state.audioPlayback) {
            state.audioPlayback.stop();
            state.audioPlayback = null;
            state.audioPlaybackSampleRate = null;
          }
          state.transport?.bargeIn();
          sendClientEvent(state, 'barge_in', { status: 'speech_start' });
        },
        onStatus: () => {
          updateStatusPill(statusPill, { label: 'Mic ready', tone: 'info' });
        }
      });
    } catch (error) {
      updateStatusPill(statusPill, { label: 'Mic blocked', tone: 'danger' });
      throw error;
    }
  }

  startButton.addEventListener('click', async () => {
    if (!state.interviewId) {
      updateStatusPill(statusPill, { label: 'Missing setup', tone: 'warning' });
      return;
    }

    const turnMode = isTurnMode();

    startButton.disabled = true;
    stopButton.disabled = false;
    updateStatusPill(statusPill, { label: turnMode ? 'Listening' : 'Connecting', tone: 'info' });
    resetSessionState();
    state.sessionActive = true;
    state.sessionStarted = true;
    state.captionFinalText = '';
    state.captionDraftText = '';
    state.turnReadyToSubmit = false;
    if (ui.setSetupCollapsed && !state.setupAutoCollapsed) {
      ui.setSetupCollapsed(true);
      state.setupAutoCollapsed = true;
    }
    updateTurnSubmitUI();

    if (turnMode) {
      state.sessionId = `turn-${Date.now()}`;
      state.liveMode = 'turn';
      ui.updateSessionToolsState?.();
      await startTurnIntro();
      return;
    }

    ui.updateSessionToolsState?.();

    try {
      await ensureTransport();
      if (!state.audioPlayback) {
        const adaptiveConfig = getAdaptiveConfig();
        state.audioPlayback = createAudioPlayback({ sampleRate: adaptiveConfig.sampleRate });
        state.audioPlaybackSampleRate = adaptiveConfig.sampleRate;
      }
      await state.audioPlayback.resume();
      state.transport.start(state.interviewId, state.userId, { resume: false, liveModel: state.liveModel });
      await startMicrophoneIfNeeded();
      startSpeechRecognition();
    } catch (error) {
      if (config.adapter !== 'mock') {
        state.transport?.stop();
        updateStatusPill(statusPill, { label: 'Live error', tone: 'danger' });
        state.sessionActive = false;
        startButton.disabled = false;
        stopButton.disabled = true;
        ui.updateSessionToolsState?.();
        return;
      }
      updateStatusPill(statusPill, { label: 'Fallback', tone: 'warning' });
      try {
        await startMockFallback();
      } catch (fallbackError) {
        updateStatusPill(statusPill, { label: 'Error', tone: 'danger' });
        state.sessionActive = false;
        startButton.disabled = false;
        stopButton.disabled = true;
        ui.updateSessionToolsState?.();
      }
    }
  });

  stopButton.addEventListener('click', async () => {
    state.sessionActive = false;
    state.geminiReady = false;
    clearGeminiReconnect(state);
    stopSpeechRecognition();
    cancelSpeechSynthesis();
    state.captionFinalText = '';
    state.captionDraftText = '';
    state.turnReadyToSubmit = false;
    state.turnAwaitingAnswer = false;
    resetTurnCompletionTracking();
    state.turnQueue = [];
    state.turnRequestActive = false;
    state.turnSpeaking = false;
    updateTurnSubmitUI();
    stopButton.disabled = true;
    state.scorePending = true;
    updateStatusPill(statusPill, { label: 'Scoring', tone: 'info' });
    renderScore(ui, {
      overall_score: '--',
      summary: 'Preparing your coaching feedback… This takes about 20 seconds.',
      strengths: [],
      improvements: []
    });
    if (ui.scoreNotice) {
      ui.scoreNotice.textContent = 'Scoring in progress. We will update this summary soon.';
    }
    ui.updateSessionToolsState?.();
    ui.scorePanel?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    ui.scorePanel?.focus?.({ preventScroll: true });

    if (state.transport) {
      state.transport.stop();
      state.transport = null;
    }

    if (state.audioCapture) {
      await state.audioCapture.stop();
      state.audioCapture = null;
    }

    stopAudioBuffer(state);
    state.activityDetector = null;

    if (state.audioPlayback) {
      await state.audioPlayback.stop();
      state.audioPlayback = null;
      state.audioPlaybackSampleRate = null;
    }

    try {
      const score = await scoreInterview({
        interviewId: state.interviewId,
        transcript: state.transcript
      });
      state.scorePending = false;
      state.score = score;
      renderScore(ui, score);
      updateStatusPill(statusPill, { label: 'Complete', tone: 'success' });
      ui.scorePanel?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      ui.scorePanel?.focus?.({ preventScroll: true });
    } catch (error) {
      updateStatusPill(statusPill, { label: 'Score Error', tone: 'danger' });
      state.scorePending = false;
      state.score = {
        overall_score: '--',
        summary: error?.message || 'Scoring failed.',
        strengths: [],
        improvements: []
      };
      renderScore(ui, state.score);
      if (ui.scoreNotice) {
        ui.scoreNotice.textContent = 'Scoring failed. You can restart or export the transcript.';
      }
    } finally {
      startButton.disabled = !state.interviewId;
      setMuteState(false);
      ui.updateSessionToolsState?.();
    }
  });

  const actionsRow = document.createElement('div');
  actionsRow.className = 'ui-controls__row';
  actionsRow.appendChild(startButton);
  actionsRow.appendChild(stopButton);
  actionsRow.appendChild(muteButton);
  actionsRow.appendChild(bargeInButton);

  const turnActionsRow = document.createElement('div');
  turnActionsRow.className = 'ui-controls__row';
  turnActionsRow.appendChild(helpTurnButton);
  turnActionsRow.appendChild(submitTurnButton);

  const turnHelp = document.createElement('div');
  turnHelp.className = 'ui-turn-help ui-state-text alert alert-info';
  turnHelp.setAttribute('data-testid', 'turn-help');
  turnHelp.setAttribute('aria-live', 'polite');
  turnHelp.setAttribute('role', 'status');
  turnHelp.textContent = 'Waiting for the coach.';

  const turnRubric = document.createElement('div');
  turnRubric.className = 'ui-turn-rubric';
  turnRubric.setAttribute('data-testid', 'turn-rubric');
  turnRubric.hidden = true;

  const turnRubricTitle = document.createElement('div');
  turnRubricTitle.className = 'ui-turn-rubric__title';
  turnRubricTitle.textContent = 'Answer rubric';

  const turnRubricList = document.createElement('ul');
  turnRubricList.className = 'ui-turn-rubric__list';

  turnRubric.appendChild(turnRubricTitle);
  turnRubric.appendChild(turnRubricList);

  const toolsRow = document.createElement('div');
  toolsRow.className = 'ui-controls__row ui-controls__row--tools';
  toolsRow.appendChild(learningModeToggle);
  toolsRow.appendChild(sessionToolsButton);

  const restartRow = document.createElement('div');
  restartRow.className = 'ui-controls__restart';
  restartRow.appendChild(restartMainLabel);
  restartRow.appendChild(restartMainButton);
  restartRow.appendChild(restartMainHelp);

  const content = document.createElement('div');
  content.className = 'layout-stack';
  content.appendChild(statusPill);
  content.appendChild(actionsRow);
  content.appendChild(turnActionsRow);
  content.appendChild(turnHelp);
  content.appendChild(turnRubric);
  content.appendChild(toolsRow);
  content.appendChild(restartRow);

  ui.statusPill = statusPill;
  ui.startButton = startButton;
  ui.stopButton = stopButton;
  ui.muteButton = muteButton;
  ui.bargeInToggle = bargeInButton;
  ui.helpTurnButton = helpTurnButton;
  ui.submitTurnButton = submitTurnButton;
  ui.turnActionsRow = turnActionsRow;
  ui.turnHelp = turnHelp;
  ui.turnRubric = turnRubric;
  ui.turnRubricList = turnRubricList;
  ui.sessionToolsToggle = sessionToolsButton;
  ui.restartButtonMain = restartMainButton;
  ui.restartMainHelp = restartMainHelp;
  ui.updateMeta = updateMeta;
  ui.applyModelOverrides = applyModelOverrides;
  ui.resetModelOverrides = resetModelOverrides;
  ui.applyVoiceOutputMode = applyVoiceOutputMode;
  ui.resetSessionState = resetSessionState;
  ui.updateTurnSubmitUI = updateTurnSubmitUI;
  updateTurnSubmitUI();
  ui.updateSetupCtas?.();

  return createPanel({
    title: 'Session Controls',
    subtitle: 'Turn-based coaching controls.',
    content,
    attrs: { 'data-testid': 'controls-panel' }
  });
}

function buildSessionToolsDrawer(state, ui, config) {
  const drawer = document.createElement('aside');
  drawer.className = 'ui-drawer ui-drawer--left';
  drawer.id = 'session-tools-drawer';
  drawer.setAttribute('aria-hidden', 'true');
  drawer.setAttribute('data-testid', 'session-tools-drawer');

  const backdrop = document.createElement('div');
  backdrop.className = 'ui-drawer__backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  backdrop.setAttribute('data-testid', 'session-tools-backdrop');

  const header = document.createElement('div');
  header.className = 'ui-drawer__header';

  const heading = document.createElement('div');
  heading.className = 'ui-drawer__heading';

  const title = document.createElement('h3');
  title.className = 'ui-drawer__title';
  title.textContent = 'Extras';

  const subtitle = document.createElement('p');
  subtitle.className = 'ui-drawer__subtitle';
  subtitle.textContent = 'Optional actions: load a past session, add custom questions, and export study guides.';

  const closeButton = createButton({
    label: 'Close',
    variant: 'ghost',
    size: 'sm',
    attrs: {
      'data-testid': 'session-tools-close',
      'aria-label': 'Close Session Tools'
    }
  });

  heading.appendChild(title);
  heading.appendChild(subtitle);
  header.appendChild(heading);
  header.appendChild(closeButton);

  const sessionSection = document.createElement('section');
  sessionSection.className = 'ui-drawer__section';

  const sessionLabel = document.createElement('label');
  sessionLabel.className = 'ui-field__label';
  sessionLabel.textContent = 'Load session';
  sessionLabel.setAttribute('for', 'session-select');

  const sessionSelect = document.createElement('select');
  sessionSelect.className = 'ui-field__input select select-bordered';
  sessionSelect.id = 'session-select';
  sessionSelect.setAttribute('data-testid', 'session-select');

  const sessionLoad = createButton({
    label: 'Load session',
    variant: 'secondary',
    size: 'sm',
    disabled: true,
    attrs: { 'data-testid': 'session-load' }
  });

  const sessionHelp = document.createElement('p');
  sessionHelp.className = 'ui-field__help ui-state-text';
  sessionHelp.textContent = 'Select a saved session to resume.';

  sessionSection.appendChild(sessionLabel);
  sessionSection.appendChild(sessionSelect);
  sessionSection.appendChild(sessionLoad);
  sessionSection.appendChild(sessionHelp);

  const nameSection = document.createElement('section');
  nameSection.className = 'ui-drawer__section';

  const nameLabel = document.createElement('label');
  nameLabel.className = 'ui-field__label';
  nameLabel.textContent = 'Session name';
  nameLabel.setAttribute('for', 'session-name-input');

  const nameInput = document.createElement('input');
  nameInput.className = 'ui-field__input input input-bordered';
  nameInput.type = 'text';
  nameInput.id = 'session-name-input';
  nameInput.placeholder = 'e.g. PM system design';
  nameInput.setAttribute('data-testid', 'session-name-input');

  const nameSave = createButton({
    label: 'Save name',
    variant: 'secondary',
    size: 'sm',
    disabled: true,
    attrs: { 'data-testid': 'session-name-save' }
  });

  const nameHelp = document.createElement('p');
  nameHelp.className = 'ui-field__help ui-state-text';
  nameHelp.textContent = 'Names are versioned per interview.';

  nameSection.appendChild(nameLabel);
  nameSection.appendChild(nameInput);
  nameSection.appendChild(nameSave);
  nameSection.appendChild(nameHelp);

  const exportSection = document.createElement('section');
  exportSection.className = 'ui-drawer__section';

  const exportLabel = document.createElement('label');
  exportLabel.className = 'ui-field__label';
  exportLabel.textContent = 'Export transcript';
  exportLabel.setAttribute('for', 'export-format');

  const exportFormat = document.createElement('select');
  exportFormat.className = 'ui-field__input select select-bordered';
  exportFormat.id = 'export-format';
  exportFormat.setAttribute('data-testid', 'export-format');

  [
    { value: 'pdf', label: 'PDF (default)' },
    { value: 'txt', label: 'Text (.txt)' }
  ].forEach((option) => {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.label;
    exportFormat.appendChild(opt);
  });
  exportFormat.value = 'pdf';

  const exportButton = createButton({
    label: 'Export PDF',
    variant: 'secondary',
    size: 'sm',
    disabled: true,
    attrs: { 'data-testid': 'export-transcript' }
  });

  const exportHelp = document.createElement('p');
  exportHelp.className = 'ui-field__help ui-state-text';
  exportHelp.setAttribute('data-testid', 'export-help');
  exportHelp.textContent = 'Enabled after transcript exists.';

  exportSection.appendChild(exportLabel);
  exportSection.appendChild(exportFormat);
  exportSection.appendChild(exportButton);
  exportSection.appendChild(exportHelp);

  drawer.appendChild(header);
  drawer.appendChild(sessionSection);
  drawer.appendChild(nameSection);
  drawer.appendChild(exportSection);
  const questionSection = document.createElement('section');
  questionSection.className = 'ui-drawer__section';

  const questionLabel = document.createElement('label');
  questionLabel.className = 'ui-field__label';
  questionLabel.textContent = 'Add known question';
  questionLabel.setAttribute('for', 'custom-question-input');

  const questionInput = document.createElement('textarea');
  questionInput.className = 'ui-field__input ui-field__input--textarea textarea textarea-bordered';
  questionInput.id = 'custom-question-input';
  questionInput.placeholder = 'Paste the question the interviewer will ask.';
  questionInput.setAttribute('data-testid', 'custom-question-input');

  const positionLabel = document.createElement('label');
  positionLabel.className = 'ui-field__label';
  positionLabel.textContent = 'Insert position';
  positionLabel.setAttribute('for', 'custom-question-position');

  const positionInput = document.createElement('input');
  positionInput.className = 'ui-field__input ui-field__input--number input input-bordered';
  positionInput.type = 'number';
  positionInput.id = 'custom-question-position';
  positionInput.min = '1';
  positionInput.value = '1';
  positionInput.setAttribute('data-testid', 'custom-question-position');

  const questionRow = document.createElement('div');
  questionRow.className = 'ui-drawer__row';

  const addAndJump = createButton({
    label: 'Add & jump',
    variant: 'primary',
    size: 'sm',
    disabled: true,
    attrs: { 'data-testid': 'custom-question-add-jump' }
  });

  const addOnly = createButton({
    label: 'Add only',
    variant: 'ghost',
    size: 'sm',
    disabled: true,
    attrs: { 'data-testid': 'custom-question-add' }
  });

  questionRow.appendChild(addAndJump);
  questionRow.appendChild(addOnly);

  const questionHelp = document.createElement('p');
  questionHelp.className = 'ui-field__help ui-state-text';
  questionHelp.textContent = 'Positions are 1-based in the question list.';

  questionSection.appendChild(questionLabel);
  questionSection.appendChild(questionInput);
  questionSection.appendChild(positionLabel);
  questionSection.appendChild(positionInput);
  questionSection.appendChild(questionRow);
  questionSection.appendChild(questionHelp);

  const restartSection = document.createElement('section');
  restartSection.className = 'ui-drawer__section';

  const restartLabel = document.createElement('label');
  restartLabel.className = 'ui-field__label';
  restartLabel.textContent = 'Restart Practice';

  const restartButton = createButton({
    label: 'Restart',
    variant: 'ghost',
    size: 'sm',
    disabled: true,
    attrs: { 'data-testid': 'restart-interview' }
  });

  const restartHelp = document.createElement('p');
  restartHelp.className = 'ui-field__help ui-state-text';
  restartHelp.textContent = 'Enabled after a session starts.';

  restartSection.appendChild(restartLabel);
  restartSection.appendChild(restartButton);
  restartSection.appendChild(restartHelp);

  drawer.appendChild(questionSection);
  drawer.appendChild(restartSection);

  ui.customQuestionInput = questionInput;
  ui.customQuestionPosition = positionInput;
  ui.customQuestionAdd = addOnly;
  ui.customQuestionAddJump = addAndJump;
  ui.customQuestionHelp = questionHelp;
  ui.restartButton = restartButton;
  ui.restartHelp = restartHelp;

  ui.sessionToolsDrawer = drawer;
  ui.sessionToolsBackdrop = backdrop;
  ui.sessionToolsClose = closeButton;
  ui.sessionSelect = sessionSelect;
  ui.sessionLoad = sessionLoad;
  ui.sessionHelp = sessionHelp;
  ui.sessionNameInput = nameInput;
  ui.sessionNameSave = nameSave;
  ui.sessionNameHelp = nameHelp;
  ui.exportFormat = exportFormat;
  ui.exportTranscript = exportButton;
  ui.exportHelp = exportHelp;

  return { drawer, backdrop };
}


  function buildQuestionsPanel(ui) {
  const list = document.createElement('ul');
  list.className = 'ui-list';
  list.setAttribute('data-testid', 'question-list');

  const placeholder = createListPlaceholder('Practice topics will appear after sharing your background.');
  list.appendChild(placeholder);

  ui.questionList = list;
  ui.questionPlaceholder = placeholder;

  const body = document.createElement('div');
  body.className = 'ui-questions__body resize-y overflow-auto';
  body.setAttribute('data-testid', 'questions-resize');
  body.appendChild(list);

  const panel = createPanel({
    title: 'Interview Questions',
    subtitle: 'Generated from the resume and role. Hover to see insights.',
    content: body,
    attrs: { 'data-testid': 'questions-panel' }
  });
  ui.questionsPanel = panel;
  return panel;
}

  function buildQuestionInsightsPanel(ui) {
  const container = document.createElement('div');
  container.className = 'ui-insights';

  const header = document.createElement('div');
  header.className = 'ui-insights__header';

  const question = document.createElement('div');
  question.className = 'ui-insights__question';
  question.setAttribute('data-testid', 'insights-question');
  question.textContent = 'Hover a topic to see coaching tips.';

  const pinBadge = document.createElement('span');
  pinBadge.className = 'ui-insights__pin';
  pinBadge.setAttribute('data-testid', 'insights-pin');
  pinBadge.textContent = 'Pinned';
  pinBadge.hidden = true;

  header.appendChild(question);
  header.appendChild(pinBadge);

  const empty = document.createElement('div');
  empty.className = 'ui-insights__empty';
  empty.textContent = 'Hover a topic to see coaching tips and which experiences to draw from.';

  const helpLabel = document.createElement('div');
  helpLabel.className = 'ui-insights__label';
  helpLabel.textContent = 'Practice answer';
  helpLabel.hidden = true;

  const helpText = document.createElement('div');
  helpText.className = 'ui-insights__help';
  helpText.setAttribute('data-testid', 'insights-help');
  helpText.hidden = true;

  const whyLabel = document.createElement('div');
  whyLabel.className = 'ui-insights__label';
  whyLabel.textContent = 'Why this is asked';

  const whyText = document.createElement('p');
  whyText.className = 'ui-insights__text';

  const rubricLabel = document.createElement('div');
  rubricLabel.className = 'ui-insights__label';
  rubricLabel.textContent = 'Answer rubric';

  const rubricList = document.createElement('ul');
  rubricList.className = 'ui-insights__list';

  const focusLabel = document.createElement('div');
  focusLabel.className = 'ui-insights__label';
  focusLabel.textContent = 'Focus areas';

  const focusList = document.createElement('ul');
  focusList.className = 'ui-insights__list ui-insights__list--focus';

  const resumeLabel = document.createElement('div');
  resumeLabel.className = 'ui-insights__label';
  resumeLabel.textContent = 'Resume cues';

  const resumeList = document.createElement('ul');
  resumeList.className = 'ui-insights__list';

  const jobLabel = document.createElement('div');
  jobLabel.className = 'ui-insights__label';
  jobLabel.textContent = 'Job cues';

  const jobList = document.createElement('ul');
  jobList.className = 'ui-insights__list';

  container.appendChild(header);
  container.appendChild(helpLabel);
  container.appendChild(helpText);
  container.appendChild(empty);
  container.appendChild(whyLabel);
  container.appendChild(whyText);
  container.appendChild(rubricLabel);
  container.appendChild(rubricList);
  container.appendChild(focusLabel);
  container.appendChild(focusList);
  container.appendChild(resumeLabel);
  container.appendChild(resumeList);
  container.appendChild(jobLabel);
  container.appendChild(jobList);

  ui.insightsQuestion = question;
  ui.insightsPin = pinBadge;
  ui.insightsEmpty = empty;
  ui.insightsHelpLabel = helpLabel;
  ui.insightsHelp = helpText;
  ui.insightsWhy = whyText;
  ui.insightsRubric = rubricList;
  ui.insightsFocus = focusList;
  ui.insightsResume = resumeList;
  ui.insightsJob = jobList;

  const body = document.createElement('div');
  body.className = 'ui-insights__body';
  body.setAttribute('data-testid', 'insights-resize');
  body.appendChild(container);

  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'ui-resize-handle flex items-center justify-center h-4 cursor-ns-resize';
  resizeHandle.setAttribute('data-testid', 'insights-resize-handle');
  const resizeBar = document.createElement('div');
  resizeBar.className = 'w-12 h-1 rounded-full bg-base-300';
  resizeHandle.appendChild(resizeBar);

  const panel = createPanel({
    title: 'Question Insights',
    subtitle: 'Hover a question or click Pin to keep details visible.',
    content: body,
    footer: resizeHandle,
    attrs: { 'data-testid': 'question-insights-panel' }
  });
  panel.classList.add('ui-panel--sticky', 'resize-y', 'overflow-auto');
  ui.insightsPanel = panel;
  return panel;
}

  function buildTranscriptPanel(ui) {
  const container = document.createElement('div');
  container.className = 'layout-stack';

  const captions = document.createElement('div');
  captions.className = 'ui-caption';

  const captionLabel = document.createElement('div');
  captionLabel.className = 'ui-caption__label';
  captionLabel.textContent = 'Captions (local, en-US)';

  const captionText = document.createElement('div');
  captionText.className = 'ui-caption__text';
  captionText.textContent = 'Captions idle.';

  captions.appendChild(captionLabel);
  captions.appendChild(captionText);

  const transcriptList = document.createElement('div');
  transcriptList.className = 'layout-stack ui-transcript__list';
  transcriptList.setAttribute('data-testid', 'transcript-list');

  renderTranscript(transcriptList, []);

  container.appendChild(captions);
  container.appendChild(transcriptList);

  ui.transcriptList = transcriptList;
  ui.captionText = captionText;

  const panel = createPanel({
    title: 'Transcript',
    subtitle: 'Updates as the session runs.',
    content: container,
    attrs: { 'data-testid': 'transcript-panel' }
  });
  ui.transcriptPanel = panel;
  return panel;
}


  function buildScorePanel(ui) {
  const scoreValue = document.createElement('div');
  scoreValue.className = 'ui-score__value';
  scoreValue.setAttribute('data-testid', 'score-value');

  const scoreProgress = document.createElement('div');
  scoreProgress.className = 'radial-progress ui-radial-progress ui-score__progress';
  scoreProgress.style.setProperty('--ui-progress-value', '28');
  scoreProgress.style.setProperty('--size', '2.4rem');
  scoreProgress.style.setProperty('--thickness', '3px');
  scoreProgress.setAttribute('data-testid', 'score-progress');
  scoreProgress.setAttribute('role', 'status');
  scoreProgress.setAttribute('aria-live', 'polite');
  scoreProgress.setAttribute('aria-label', 'Scoring interview');
  scoreProgress.setAttribute('aria-hidden', 'true');
  scoreProgress.hidden = true;

  const scoreHeader = document.createElement('div');
  scoreHeader.className = 'ui-score__header';
  scoreHeader.appendChild(scoreValue);
  scoreHeader.appendChild(scoreProgress);

  const scoreNotice = document.createElement('div');
  scoreNotice.className = 'ui-field__help ui-state-text';
  scoreNotice.textContent = 'Score will appear after you end the session.';

  const scoreSummary = document.createElement('div');
  scoreSummary.className = 'ui-score__summary ui-markdown';

  const strengthsLabel = document.createElement('div');
  strengthsLabel.className = 'ui-score__label';
  strengthsLabel.textContent = 'Strengths';

  const strengthsList = document.createElement('ul');
  strengthsList.className = 'ui-score__list';

  const improvementsLabel = document.createElement('div');
  improvementsLabel.className = 'ui-score__label';
  improvementsLabel.textContent = 'Focus next';

  const improvementsList = document.createElement('ul');
  improvementsList.className = 'ui-score__list';

  const exportActions = document.createElement('div');
  exportActions.className = 'ui-inline ui-score__actions';

  const exportPdfMain = createButton({
    label: 'Export PDF',
    variant: 'secondary',
    size: 'sm',
    disabled: true,
    attrs: { 'data-testid': 'export-pdf-main' }
  });

  const exportTxtMain = createButton({
    label: 'Export TXT',
    variant: 'secondary',
    size: 'sm',
    disabled: true,
    attrs: { 'data-testid': 'export-txt-main' }
  });

  const exportMainHelp = document.createElement('p');
  exportMainHelp.className = 'ui-field__help ui-state-text';
  exportMainHelp.textContent = 'Exports are enabled once a transcript exists.';

  exportActions.appendChild(exportPdfMain);
  exportActions.appendChild(exportTxtMain);

  const container = document.createElement('div');
  container.className = 'ui-score';
  container.setAttribute('data-testid', 'score-summary');
  container.appendChild(scoreHeader);
  container.appendChild(scoreNotice);
  container.appendChild(scoreSummary);
  container.appendChild(strengthsLabel);
  container.appendChild(strengthsList);
  container.appendChild(improvementsLabel);
  container.appendChild(improvementsList);
  container.appendChild(exportActions);
  container.appendChild(exportMainHelp);

  ui.scoreValue = scoreValue;
  ui.scoreProgress = scoreProgress;
  ui.scoreNotice = scoreNotice;
  ui.scoreSummary = scoreSummary;
  ui.scoreStrengths = strengthsList;
  ui.scoreImprovements = improvementsList;
  ui.exportPdfMain = exportPdfMain;
  ui.exportTxtMain = exportTxtMain;
  ui.exportMainHelp = exportMainHelp;

  renderScore(ui, null);

  const panel = createPanel({
    title: 'Session Insights',
    subtitle: 'Your coaching feedback and practice highlights.',
    content: container,
    attrs: { 'data-testid': 'score-panel' }
  });
  panel.tabIndex = -1;
  ui.scorePanel = panel;
  return panel;
}

export function buildVoiceLayout() {
  const config = getAppConfig();
  const state = {
    interviewId: null,
    sessionId: null,
    questions: [],
    questionStatuses: [],
    focusAreas: [],
    resumeExcerpt: '',
    jobExcerpt: '',
    questionInsightsPinnedIndex: null,
    questionInsightsActiveIndex: null,
    transcript: [],
    score: null,
    scorePending: false,
    adapter: config.adapter,
    voiceMode: 'turn',
    voiceOutputMode: config.voiceOutputMode,
    userId: config.userId,
    liveModel: config.liveModel,
    textModel: config.textModel,
    ttsModel: config.ttsModel,
    voiceTtsLanguage: config.voiceTtsLanguage,
    turnEndDelayMs: config.voiceTurnEndDelayMs,
    turnCompletionConfidence: config.voiceTurnCompletionConfidence,
    turnCompletionCooldownMs: config.voiceTurnCompletionCooldownMs,
    liveMode: null,
    transport: null,
    audioCapture: null,
    audioPlayback: null,
    audioPlaybackSampleRate: null,
    e2eCandidatePlayback: null,
    e2eCandidatePlaybackSampleRate: null,
    e2eCandidatePlaybackEnabled: false,
    audioFrameBuffer: null,
    audioFrameFlusher: null,
    activityDetector: null,
    speechRecognition: null,
    speechRecognitionEnabled: false,
    speechRecognitionActive: false,
    speechRecognitionRestartTimer: null,
    turnEndTimer: null,
    captionFinalText: '',
    captionDraftText: '',
    turnReadyToSubmit: false,
    turnAwaitingAnswer: false,
    geminiReady: false,
    sessionActive: false,
    sessionStarted: false,
    isMuted: false,
    bargeInEnabled: true,
    sessionName: '',
    askedQuestionIndex: null,
    sessions: [],
    geminiReconnectAttempts: 0,
    geminiReconnectTimer: null,
    turnQueue: [],
    turnRequestActive: false,
    turnHelpPending: false,
    turnSpeaking: false,
    turnAudioStop: null,
    turnAnswerStartedAt: null,
    turnCompletionLastCheckAt: 0,
    turnCompletionPending: false,
    turnAwaitingStartedAt: null,
    turnHelpHintTimer: null,
    turnHelpHintVisible: false,
    turnRubricVisible: false,
    liveAudioSeen: false,
    liveCoachPendingText: '',
    liveCoachSpeakTimer: null,
    lastSpokenCoachText: '',
    lastCoachQuestion: '',
    setupAutoCollapsed: false,
    heroAutoCollapsed: false,
    questionHelpExamples: [],
    // Learning Mode state (teach-first coaching)
    showExampleFirst: getLearningModePreference(),
    learningModeActive: false,
    currentLearningCard: null
  };

  // Learning Mode preference persistence
  function getLearningModePreference() {
    if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') {
      return true;
    }
    const stored = localStorage.getItem('preptalk_show_example_first');
    if (stored === null) return true; // Default ON for new users
    return stored === 'true';
  }

  function setLearningModePreference(value) {
    state.showExampleFirst = value;
    if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
      localStorage.setItem('preptalk_show_example_first', String(value));
    }
    if (ui.learningModeToggle) {
      ui.learningModeToggle.setAttribute('aria-pressed', String(value));
      updateButtonLabel(ui.learningModeToggle, value ? 'Learning Mode: ON' : 'Learning Mode: OFF');
    }
  }

  const ui = {};
  if (typeof window !== 'undefined' && window.__E2E__) {
    window.__e2eState = state;
    window.__e2eUi = ui;
  }

  function syncQuestionStatuses(statuses) {
    state.questionStatuses = normalizeQuestionStatuses(state.questions, statuses);
    if (ui.questionList && ui.questionPlaceholder) {
      renderQuestions(
        ui.questionList,
        state.questions,
        state.questionStatuses,
        ui.questionPlaceholder,
        onQuestionStatusChange,
        buildQuestionRenderOptions(ui, state)
      );
    }
  }

  function applyLocalQuestionStatus(index, status, updatedAt) {
    if (!state.questionStatuses?.length) {
      state.questionStatuses = normalizeQuestionStatuses(state.questions, state.questionStatuses);
    }
    if (!state.questionStatuses[index]) {
      return;
    }
    state.questionStatuses[index] = {
      status,
      updated_at: updatedAt || state.questionStatuses[index].updated_at || ''
    };
  }

  async function setQuestionStatus(index, status, source = 'user') {
    if (!state.interviewId) {
      return;
    }
    const previous = state.questionStatuses[index];
    applyLocalQuestionStatus(index, status);
    renderQuestions(
      ui.questionList,
      state.questions,
      state.questionStatuses,
      ui.questionPlaceholder,
      onQuestionStatusChange,
      buildQuestionRenderOptions(ui, state)
    );
    try {
      const response = await updateQuestionStatus({
        interviewId: state.interviewId,
        index,
        status,
        source
      });
      syncQuestionStatuses(response.question_statuses);
      if (response.asked_question_index !== undefined) {
        state.askedQuestionIndex = response.asked_question_index;
      }
    } catch (error) {
      if (previous) {
        applyLocalQuestionStatus(index, previous.status, previous.updated_at);
      }
      renderQuestions(
        ui.questionList,
        state.questions,
        state.questionStatuses,
        ui.questionPlaceholder,
        onQuestionStatusChange,
        buildQuestionRenderOptions(ui, state)
      );
    }
  }

  function onQuestionStatusChange(index, status) {
    void setQuestionStatus(index, status, 'user');
  }

  ui.onQuestionStatusChange = onQuestionStatusChange;

  function renderInsightList(list, items, emptyText) {
    list.innerHTML = '';
    const values = Array.isArray(items) ? items.filter(Boolean) : [];
    if (values.length === 0) {
      const li = document.createElement('li');
      li.className = 'ui-insights__empty-item';
      li.textContent = emptyText;
      list.appendChild(li);
      return;
    }
    values.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      list.appendChild(li);
    });
  }

  function parseFocusAreaEntry(entry) {
    if (!entry) {
      return null;
    }
    if (typeof entry === 'object') {
      const title = entry.area || entry.title || entry.name;
      const description = entry.description || entry.details || entry.summary || '';
      if (!title && !description) {
        return null;
      }
      return {
        title: String(title || description || '').trim(),
        description: String(description || '').trim()
      };
    }
    if (typeof entry === 'string') {
      const raw = entry.trim();
      if (!raw) return null;
      if (raw.startsWith('{') && raw.includes('area')) {
        const areaMatch = raw.match(/['"]area['"]\s*:\s*(['"])(.*?)\1/);
        const descMatch = raw.match(/['"]description['"]\s*:\s*(['"])([\s\S]*?)\1/);
        const title = areaMatch?.[2]?.trim();
        const description = descMatch?.[2]?.trim() || '';
        if (title || description) {
          return { title: title || raw, description };
        }
      }
      return { title: raw, description: '' };
    }
    return null;
  }

  function normalizeFocusAreas(items) {
    const values = Array.isArray(items) ? items : [];
    return values
      .map((entry) => parseFocusAreaEntry(entry))
      .filter(Boolean);
  }

  function renderFocusAreas(list, areas, emptyText) {
    list.innerHTML = '';
    const values = normalizeFocusAreas(areas);
    if (values.length === 0) {
      const li = document.createElement('li');
      li.className = 'ui-insights__empty-item';
      li.textContent = emptyText;
      list.appendChild(li);
      return;
    }
    values.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'ui-insights__focus-item';
      const title = document.createElement('div');
      title.className = 'ui-insights__focus-title';
      title.textContent = item.title;
      li.appendChild(title);
      if (item.description) {
        const description = document.createElement('div');
        description.className = 'ui-insights__focus-description';
        description.textContent = item.description;
        li.appendChild(description);
      }
      list.appendChild(li);
    });
  }

  function updateQuestionInsights(index, options = {}) {
    if (!ui.insightsQuestion) {
      return;
    }
    const { source = 'hover', clear = false } = options;
    if (clear) {
      state.questionInsightsPinnedIndex = null;
    }
    const maxIndex = state.questions.length - 1;
    if (Number.isInteger(state.questionInsightsPinnedIndex)
      && state.questionInsightsPinnedIndex > maxIndex) {
      state.questionInsightsPinnedIndex = null;
    }
    const resolvedIndex = Number.isInteger(index) ? index : null;
    if (source === 'pin') {
      if (resolvedIndex === null) {
        state.questionInsightsPinnedIndex = null;
      } else if (state.questionInsightsPinnedIndex === resolvedIndex) {
        state.questionInsightsPinnedIndex = null;
      } else {
        state.questionInsightsPinnedIndex = resolvedIndex;
      }
    }
    const activeIndex = state.questionInsightsPinnedIndex ?? resolvedIndex;
    state.questionInsightsActiveIndex = activeIndex;

    if (ui.insightsPin) {
      if (state.questionInsightsPinnedIndex === null) {
        ui.insightsPin.hidden = true;
      } else {
        ui.insightsPin.hidden = false;
        ui.insightsPin.textContent = `Pinned · Q${state.questionInsightsPinnedIndex + 1}`;
      }
    }

    if (activeIndex === null || !state.questions[activeIndex]) {
      ui.insightsQuestion.textContent = 'Hover a question to see insights.';
      ui.insightsEmpty.hidden = false;
      if (ui.insightsHelpLabel) {
        ui.insightsHelpLabel.hidden = true;
      }
      if (ui.insightsHelp) {
        ui.insightsHelp.hidden = true;
        ui.insightsHelp.textContent = '';
      }
      ui.insightsWhy.textContent = '';
      renderInsightList(ui.insightsRubric, [], 'Rubric details appear after question selection.');
      renderInsightList(ui.insightsFocus, [], 'Focus areas will appear after question generation.');
      renderInsightList(ui.insightsResume, [], 'Resume cues will appear after question selection.');
      renderInsightList(ui.insightsJob, [], 'Job cues will appear after question selection.');
      return;
    }

    const questionText = state.questions[activeIndex];
    const rubric = buildQuestionRubric(questionText);
    ui.insightsQuestion.textContent = questionText;
    ui.insightsEmpty.hidden = true;
    ui.insightsWhy.textContent = rubric.why;

    const helpExample = Array.isArray(state.questionHelpExamples)
      ? state.questionHelpExamples[activeIndex]
      : null;
    if (ui.insightsHelpLabel && ui.insightsHelp) {
      if (helpExample) {
        ui.insightsHelpLabel.hidden = false;
        ui.insightsHelp.hidden = false;
        ui.insightsHelp.textContent = helpExample;
      } else {
        ui.insightsHelpLabel.hidden = true;
        ui.insightsHelp.hidden = true;
        ui.insightsHelp.textContent = '';
      }
    }

    renderInsightList(ui.insightsRubric, rubric.rubric, 'No rubric details available.');
    renderFocusAreas(ui.insightsFocus, state.focusAreas.slice(0, 4), 'No focus areas available yet.');
    renderInsightList(
      ui.insightsResume,
      pickInsightLines(state.resumeExcerpt, questionText),
      'No matching resume lines found yet.'
    );
    renderInsightList(
      ui.insightsJob,
      pickInsightLines(state.jobExcerpt, questionText),
      state.jobExcerpt ? 'No matching job lines found yet.' : 'No job cues available yet.'
    );

    if (source === 'pin' && ui.questionList && ui.questionPlaceholder) {
      renderQuestions(
        ui.questionList,
        state.questions,
        state.questionStatuses,
        ui.questionPlaceholder,
        onQuestionStatusChange,
        buildQuestionRenderOptions(ui, state)
      );
    }
  }

  function onQuestionHover(index) {
    updateQuestionInsights(index, { source: 'hover' });
  }

  function onQuestionPin(index) {
    updateQuestionInsights(index, { source: 'pin' });
  }

  ui.onQuestionHover = onQuestionHover;
  ui.onQuestionPin = onQuestionPin;
  ui.updateQuestionInsights = updateQuestionInsights;

  function resolveHelpQuestionIndex(questionText) {
    if (Number.isInteger(state.askedQuestionIndex)) {
      return state.askedQuestionIndex;
    }
    const cleaned = String(questionText || '').trim();
    if (cleaned) {
      const matchIndex = state.questions.findIndex(
        (question) => String(question || '').trim() === cleaned
      );
      if (matchIndex >= 0) {
        return matchIndex;
      }
    }
    if (Number.isInteger(state.questionInsightsPinnedIndex)) {
      return state.questionInsightsPinnedIndex;
    }
    if (Number.isInteger(state.questionInsightsActiveIndex)) {
      return state.questionInsightsActiveIndex;
    }
    return null;
  }

  function applyHelpExample(questionText, helpText) {
    const cleanedHelp = String(helpText || '').trim();
    if (!cleanedHelp) {
      return;
    }
    const index = resolveHelpQuestionIndex(questionText);
    if (!Number.isInteger(index) || !state.questions[index]) {
      return;
    }
    if (!Array.isArray(state.questionHelpExamples)) {
      state.questionHelpExamples = [];
    }
    state.questionHelpExamples[index] = cleanedHelp;
    const alreadyPinned = state.questionInsightsPinnedIndex === index;
    updateQuestionInsights(index, { source: alreadyPinned ? 'hover' : 'pin' });
  }

  ui.applyHelpExample = applyHelpExample;

  function isCoachRole(role) {
    const normalized = String(role || '').toLowerCase();
    return normalized === 'coach' || normalized === 'assistant' || normalized === 'ai';
  }

  function autoStartNextQuestion(role) {
    if (!isCoachRole(role)) {
      return;
    }
    if (!state.questionStatuses?.length) {
      return;
    }
    if (state.questionStatuses.some((entry) => entry.status === 'started')) {
      return;
    }
    const index = state.questionStatuses.findIndex((entry) => entry.status !== 'answered');
    if (index === -1) {
      return;
    }
    if (state.questionStatuses[index].status === 'not_started') {
      void setQuestionStatus(index, 'started', 'auto');
    }
  }

  ui.autoStartNextQuestion = autoStartNextQuestion;


  const leftColumn = document.createElement('div');
  leftColumn.className = 'layout-stack';
  const setupPanel = buildSetupPanel(state, ui);
  leftColumn.appendChild(setupPanel);
  const controlsPanel = buildControlsPanel(state, ui, config);
  ui.controlsPanel = controlsPanel;
  leftColumn.appendChild(controlsPanel);

  const rightColumn = document.createElement('div');
  rightColumn.className = 'layout-stack';
  const questionRow = document.createElement('div');
  questionRow.className = 'layout-duo';
  questionRow.appendChild(buildQuestionsPanel(ui));
  questionRow.appendChild(buildQuestionInsightsPanel(ui));
  ui.questionRow = questionRow;
  rightColumn.appendChild(questionRow);
  rightColumn.appendChild(buildTranscriptPanel(ui));
  rightColumn.appendChild(buildScorePanel(ui));
  ui.rightColumn = rightColumn;
  ui.reorderTranscript = (showTranscript) => {
    if (!ui.rightColumn || !ui.transcriptPanel || !ui.questionRow) {
      return;
    }
    const shouldLead = Boolean(showTranscript);
    const firstChild = ui.rightColumn.firstChild;
    if (shouldLead && firstChild !== ui.transcriptPanel) {
      ui.rightColumn.insertBefore(ui.transcriptPanel, ui.questionRow);
    }
    if (!shouldLead && firstChild === ui.transcriptPanel) {
      ui.rightColumn.insertBefore(ui.questionRow, ui.transcriptPanel);
    }
  };

  const layout = document.createElement('main');
  layout.className = 'layout-split';
  layout.appendChild(leftColumn);
  layout.appendChild(rightColumn);

  const page = document.createElement('div');
  page.className = 'layout-page';
  page.appendChild(buildAppHeader(ui));
  page.appendChild(layout);

  const { drawer, backdrop } = buildSessionToolsDrawer(state, ui, config);
  page.appendChild(drawer);
  page.appendChild(backdrop);

  function formatSessionTimestamp(value) {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString();
  }

  function formatSessionLabel(session) {
    const name = session.session_name || session.role_title || 'Untitled session';
    const role = session.session_name && session.role_title ? ` • ${session.role_title}` : '';
    const timestamp = formatSessionTimestamp(session.updated_at || session.created_at);
    const timeLabel = timestamp ? ` • ${timestamp}` : '';
    return `${name}${role}${timeLabel}`;
  }

  function populateSessionSelect(sessions) {
    if (!ui.sessionSelect) return;
    ui.sessionSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = sessions.length ? 'Select a session' : 'No sessions found';
    ui.sessionSelect.appendChild(placeholder);
    sessions.forEach((session) => {
      const option = document.createElement('option');
      option.value = session.interview_id;
      option.textContent = formatSessionLabel(session);
      ui.sessionSelect.appendChild(option);
    });
    if (state.interviewId && sessions.some((session) => session.interview_id === state.interviewId)) {
      ui.sessionSelect.value = state.interviewId;
    }
  }

  async function refreshSessionList() {
    if (!ui.sessionSelect || !ui.sessionHelp) return;
    ui.sessionHelp.textContent = 'Loading sessions...';
    try {
      const response = await listSessions();
      const sessions = response.sessions || [];
      state.sessions = sessions;
      populateSessionSelect(sessions);
      ui.sessionHelp.textContent = sessions.length
        ? `${sessions.length} saved sessions available.`
        : 'No saved sessions yet.';
    } catch (error) {
      ui.sessionHelp.textContent = error.message || 'Unable to load sessions.';
    } finally {
      ui.updateSessionToolsState?.();
    }
  }

  async function loadSelectedSession() {
    const selectedId = ui.sessionSelect?.value;
    if (!selectedId) {
      ui.updateSessionToolsState?.();
      return;
    }
    if (state.sessionActive) {
      ui.sessionHelp.textContent = 'Stop the session before loading another.';
      return;
    }
    ui.sessionHelp.textContent = 'Loading session...';
    try {
      const summary = await getInterviewSummary({ interviewId: selectedId });
      state.interviewId = summary.interview_id;
      state.questions = summary.questions || [];
      state.questionStatuses = normalizeQuestionStatuses(state.questions, summary.question_statuses);
      state.transcript = summary.transcript || [];
      const hasScore = summary.overall_score !== null
        || summary.summary
        || (summary.strengths && summary.strengths.length > 0)
        || (summary.improvements && summary.improvements.length > 0);
      state.score = hasScore
        ? {
          overall_score: summary.overall_score,
          summary: summary.summary,
          strengths: summary.strengths || [],
          improvements: summary.improvements || []
        }
        : null;
      state.scorePending = false;
      state.adapter = summary.adapter || state.adapter;
      state.sessionName = summary.session_name || '';
      state.askedQuestionIndex = summary.asked_question_index ?? null;
      state.sessionStarted = state.transcript.length > 0 || hasScore;
      state.setupAutoCollapsed = false;
      state.sessionActive = false;
      state.sessionId = null;
      state.liveMode = null;
      state.focusAreas = [];
      state.resumeExcerpt = '';
      state.jobExcerpt = '';
      state.questionHelpExamples = [];
      state.questionInsightsPinnedIndex = null;
      state.questionInsightsActiveIndex = null;
      clearGeminiReconnect(state);

      renderQuestions(
        ui.questionList,
        state.questions,
        state.questionStatuses,
        ui.questionPlaceholder,
        ui.onQuestionStatusChange,
        buildQuestionRenderOptions(ui, state)
      );
      renderTranscript(ui.transcriptList, state.transcript);
      renderScore(ui, state.score);
      const defaultInsightIndex = state.questions.length > 0 ? 0 : null;
      ui.updateQuestionInsights?.(defaultInsightIndex, { clear: true });

      if (ui.sessionNameInput) {
        ui.sessionNameInput.value = state.sessionName;
      }
      if (ui.sessionNameHelp) {
        ui.sessionNameHelp.textContent = state.sessionName
          ? 'Session name loaded.'
          : 'Add a name to keep sessions organized.';
      }
      if (ui.setupStatus) {
        ui.setupStatus.className = 'ui-field__help ui-state-text';
        ui.setupStatus.textContent = 'Session loaded. Start the session when ready.';
      }
      ui.sessionHelp.textContent = 'Session loaded.';
      ui.startButton.disabled = !state.interviewId;
      ui.stopButton.disabled = true;
      updateStatusPill(ui.statusPill, { label: 'Idle', tone: 'neutral' });
      ui.updateMeta?.();
      ui.updateSessionToolsState?.();
    } catch (error) {
      ui.sessionHelp.textContent = error.message || 'Unable to load session.';
      ui.updateSessionToolsState?.();
    }
  }

  function setDrawerOpen(isOpen) {
    const hidden = !isOpen;
    drawer.setAttribute('aria-hidden', String(hidden));
    backdrop.setAttribute('aria-hidden', String(hidden));
    drawer.classList.toggle('ui-drawer--open', isOpen);
    backdrop.classList.toggle('ui-drawer__backdrop--open', isOpen);
    if (ui.sessionToolsToggle) {
      ui.sessionToolsToggle.setAttribute('aria-expanded', String(isOpen));
    }
    if (isOpen) {
      void refreshSessionList();
    }
  }

  ui.sessionToolsToggle?.addEventListener('click', () => setDrawerOpen(true));
  ui.sessionToolsClose?.addEventListener('click', () => setDrawerOpen(false));
  ui.sessionToolsBackdrop?.addEventListener('click', () => setDrawerOpen(false));

  function updateSessionToolsState() {
    const hasInterview = Boolean(state.interviewId);
    const hasQuestions = state.questions.length > 0;
    const hasTranscript = state.transcript.length > 0;
    const canRestart = hasInterview && state.sessionStarted && !state.sessionActive;
    const hasScore = Boolean(state.score);
    const showScore = hasScore || state.scorePending;
    const inResults = showScore && !state.sessionActive;
    const showControls = hasQuestions || state.sessionActive || inResults;
    const restartPrimary = inResults;
    const nameValue = ui.sessionNameInput?.value.trim() || '';
    const questionValue = ui.customQuestionInput?.value.trim() || '';
    const selectedSession = ui.sessionSelect?.value || '';
    const exportFormat = ui.exportFormat?.value || 'pdf';

    if (ui.sessionNameSave) {
      ui.sessionNameSave.disabled = !(hasInterview && nameValue.length > 0);
    }
    if (ui.sessionLoad) {
      ui.sessionLoad.disabled = !selectedSession || state.sessionActive;
    }
    if (ui.customQuestionAdd) {
      ui.customQuestionAdd.disabled = !(hasInterview && questionValue.length > 0);
    }
    if (ui.customQuestionAddJump) {
      ui.customQuestionAddJump.disabled = !(hasInterview && questionValue.length > 0);
    }
    if (ui.exportTranscript) {
      ui.exportTranscript.disabled = !(hasInterview && hasTranscript);
    }
    if (ui.exportPdfMain) {
      ui.exportPdfMain.disabled = !(hasInterview && hasTranscript);
    }
    if (ui.exportTxtMain) {
      ui.exportTxtMain.disabled = !(hasInterview && hasTranscript);
    }
    if (ui.restartButton) {
      ui.restartButton.disabled = !canRestart;
    }
    if (ui.restartButtonMain) {
      ui.restartButtonMain.disabled = !canRestart;
    }
    if (ui.restartButtonMain) {
      setButtonVariant(ui.restartButtonMain, restartPrimary ? 'primary' : 'ghost');
    }
    if (ui.exportTranscript) {
      updateButtonLabel(ui.exportTranscript, exportFormat === 'txt' ? 'Export TXT' : 'Export PDF');
    }
    if (ui.setupCollapse) {
      ui.setupCollapse.disabled = !hasInterview;
      ui.setupCollapse.hidden = !hasInterview;
      if (!hasInterview && ui.setSetupCollapsed) {
        ui.setSetupCollapsed(false);
      }
    }
    ui.updateSetupCtas?.();

    if (!hasInterview) {
      state.setupAutoCollapsed = false;
      if (ui.setSetupCollapsed) {
        ui.setSetupCollapsed(false);
      }
    }
    if (hasQuestions && ui.setSetupCollapsed && !state.setupAutoCollapsed) {
      ui.setSetupCollapsed(true);
      state.setupAutoCollapsed = true;
    }

    if (ui.heroToggle) {
      ui.heroToggle.hidden = !hasQuestions;
    }
    if (!hasQuestions) {
      state.heroAutoCollapsed = false;
      if (ui.setHeroCollapsed) {
        ui.setHeroCollapsed(false);
      }
    }
    if (hasQuestions && ui.setHeroCollapsed && !state.heroAutoCollapsed) {
      ui.setHeroCollapsed(true);
      state.heroAutoCollapsed = true;
    }

    const showQuestions = hasQuestions && !inResults;
    const showTranscript = state.sessionActive || (hasTranscript && !inResults);

    if (ui.questionRow) {
      ui.questionRow.hidden = !showQuestions;
    }
    if (ui.questionsPanel) {
      ui.questionsPanel.hidden = !showQuestions;
    }
    if (ui.insightsPanel) {
      ui.insightsPanel.hidden = !showQuestions;
    }
    if (ui.transcriptPanel) {
      ui.transcriptPanel.hidden = !showTranscript;
    }
    ui.reorderTranscript?.(showTranscript);
    if (ui.scorePanel) {
      ui.scorePanel.hidden = !showScore;
    }
    if (ui.scoreProgress) {
      const scoreProgressActive = state.scorePending;
      ui.scoreProgress.hidden = !scoreProgressActive;
      ui.scoreProgress.setAttribute('aria-hidden', String(!scoreProgressActive));
      ui.scoreProgress.classList.toggle('ui-radial-progress--active', scoreProgressActive);
    }
    if (ui.controlsPanel) {
      ui.controlsPanel.hidden = !showControls;
      ui.controlsPanel.classList.toggle('ui-controls--results', inResults && !state.sessionActive);
    }

    if (ui.exportHelp) {
      ui.exportHelp.textContent = hasTranscript
        ? `Downloads the study guide ${exportFormat === 'txt' ? 'text file' : 'PDF'}.`
        : 'Enabled after transcript exists.';
    }
    if (ui.exportMainHelp) {
      ui.exportMainHelp.textContent = hasTranscript
        ? 'Export your study guide as PDF or TXT.'
        : 'Exports are enabled once a transcript exists.';
    }
    if (ui.restartHelp) {
      ui.restartHelp.textContent = state.sessionActive
        ? 'Stop the session to restart.'
        : 'Enabled after a session starts.';
    }
    if (ui.restartMainHelp) {
      ui.restartMainHelp.textContent = state.sessionActive
        ? 'Stop the session to restart.'
        : 'Enabled after a session starts.';
    }
  }

  ui.updateSessionToolsState = updateSessionToolsState;
  ui.refreshSessionList = refreshSessionList;

  ui.sessionSelect?.addEventListener('change', () => {
    const selectedId = ui.sessionSelect?.value || '';
    const session = state.sessions.find((entry) => entry.interview_id === selectedId);
    if (ui.sessionHelp) {
      ui.sessionHelp.textContent = session
        ? `Selected: ${formatSessionLabel(session)}`
        : 'Select a saved session to resume.';
    }
    updateSessionToolsState();
  });

  ui.sessionLoad?.addEventListener('click', () => {
    void loadSelectedSession();
  });

  ui.exportFormat?.addEventListener('change', updateSessionToolsState);
  ui.sessionNameInput?.addEventListener('input', updateSessionToolsState);
  ui.customQuestionInput?.addEventListener('input', updateSessionToolsState);
  ui.customQuestionPosition?.addEventListener('input', updateSessionToolsState);
  const handleModelInputChange = () => {
    void ui.applyModelOverrides?.();
  };
  ui.liveModelInput?.addEventListener('change', handleModelInputChange);
  ui.textModelInput?.addEventListener('change', handleModelInputChange);
  ui.ttsModelInput?.addEventListener('change', handleModelInputChange);
  const handleVoiceOutputChange = () => {
    ui.applyVoiceOutputMode?.(ui.voiceOutputSelect?.value);
  };
  ui.voiceOutputSelect?.addEventListener('change', handleVoiceOutputChange);
  ui.resetModelsButton?.addEventListener('click', () => {
    void ui.resetModelOverrides?.();
  });

  ui.sessionNameSave?.addEventListener('click', async () => {
    const name = ui.sessionNameInput?.value.trim();
    if (!state.interviewId || !name) {
      updateSessionToolsState();
      return;
    }
    try {
      const response = await updateSessionName({
        interviewId: state.interviewId,
        name
      });
      state.sessionName = response.session_name;
      ui.sessionNameHelp.textContent = `Saved as v${response.version}.`;
      ui.updateMeta?.();
      ui.refreshSessionList?.();
    } catch (error) {
      ui.sessionNameHelp.textContent = error.message || 'Unable to save session name.';
    } finally {
      updateSessionToolsState();
    }
  });

  async function handleCustomQuestion({ jump }) {
    const question = ui.customQuestionInput?.value.trim();
    if (!state.interviewId || !question) {
      updateSessionToolsState();
      return;
    }
    const positionValue = Number.parseInt(ui.customQuestionPosition?.value || '1', 10);
    const position = Number.isFinite(positionValue) && positionValue > 0 ? positionValue : 1;
    try {
      const response = await addCustomQuestion({
        interviewId: state.interviewId,
        question,
        position
      });
      state.questions = response.questions || [];
      syncQuestionStatuses(response.question_statuses);
      if (jump) {
        const target = ui.questionList.querySelector(`[data-index="${response.index}"]`);
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      ui.customQuestionInput.value = '';
    } catch (error) {
      ui.customQuestionHelp.textContent = error.message || 'Unable to add question.';
      updateSessionToolsState();
      return;
    }
    ui.customQuestionHelp.textContent = 'Positions are 1-based in the question list.';
    updateSessionToolsState();
  }

  ui.customQuestionAdd?.addEventListener('click', () => {
    void handleCustomQuestion({ jump: false });
  });
  ui.customQuestionAddJump?.addEventListener('click', () => {
    void handleCustomQuestion({ jump: true });
  });

  async function downloadStudyGuideFile(format, { onSuccess, onError } = {}) {
    if (!state.interviewId) return;
    try {
      const blob = await downloadStudyGuide({ interviewId: state.interviewId, format });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `interview-${state.interviewId}.${format === 'txt' ? 'txt' : 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      if (typeof onSuccess === 'function') {
        onSuccess();
      }
    } catch (error) {
      if (typeof onError === 'function') {
        onError(error);
      }
    }
  }

  ui.exportTranscript?.addEventListener('click', async () => {
    const format = ui.exportFormat?.value || 'pdf';
    await downloadStudyGuideFile(format, {
      onSuccess: () => {
        if (ui.exportHelp) {
          ui.exportHelp.textContent = 'Download started.';
        }
      },
      onError: (error) => {
        if (ui.exportHelp) {
          ui.exportHelp.textContent = error?.message || 'Unable to export PDF.';
        }
      }
    });
  });

  ui.exportPdfMain?.addEventListener('click', async () => {
    await downloadStudyGuideFile('pdf', {
      onSuccess: () => {
        if (ui.exportMainHelp) {
          ui.exportMainHelp.textContent = 'Download started.';
        }
      },
      onError: (error) => {
        if (ui.exportMainHelp) {
          ui.exportMainHelp.textContent = error?.message || 'Unable to export PDF.';
        }
      }
    });
  });

  ui.exportTxtMain?.addEventListener('click', async () => {
    await downloadStudyGuideFile('txt', {
      onSuccess: () => {
        if (ui.exportMainHelp) {
          ui.exportMainHelp.textContent = 'Download started.';
        }
      },
      onError: (error) => {
        if (ui.exportMainHelp) {
          ui.exportMainHelp.textContent = error?.message || 'Unable to export TXT.';
        }
      }
    });
  });

  async function handleRestart() {
    if (!state.interviewId) return;
    try {
      await restartInterview({ interviewId: state.interviewId });
      ui.resetSessionState?.();
      state.sessionStarted = false;
      state.askedQuestionIndex = null;
      ui.startButton.disabled = false;
      ui.stopButton.disabled = true;
      updateStatusPill(ui.statusPill, { label: 'Idle', tone: 'neutral' });
    } catch (error) {
      const message = error.message || 'Unable to restart session.';
      if (ui.restartHelp) {
        ui.restartHelp.textContent = message;
      }
      if (ui.restartMainHelp) {
        ui.restartMainHelp.textContent = message;
      }
    } finally {
      updateSessionToolsState();
    }
  }

  ui.restartButton?.addEventListener('click', () => {
    void handleRestart();
  });
  ui.restartButtonMain?.addEventListener('click', () => {
    void handleRestart();
  });

  updateSessionToolsState();
  return page;
}

export function mountVoiceApp(root) {
  if (!root) return;
  root.innerHTML = '';
  root.appendChild(buildVoiceLayout());
}
