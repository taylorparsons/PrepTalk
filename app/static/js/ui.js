import {
  createButton,
  createPanel,
  createStatusPill,
  createTranscriptRow
} from './components/index.js';
import {
  addCustomQuestion,
  createInterview,
  downloadStudyGuide,
  getInterviewSummary,
  getLogSummary,
  listSessions,
  logClientEvent,
  restartInterview,
  scoreInterview,
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

const STATUS_TONES = ['neutral', 'success', 'warning', 'danger', 'info'];
const GEMINI_RECONNECT_MAX_ATTEMPTS = 3;
const GEMINI_RECONNECT_DELAY_MS = 600;
const AUDIO_FRAME_INTERVAL_MS = 20;
const AUDIO_BUFFER_WINDOW_MS = 1200;
const AUDIO_BUFFER_MAX_FRAMES = Math.ceil(AUDIO_BUFFER_WINDOW_MS / AUDIO_FRAME_INTERVAL_MS);
const AUDIO_ACTIVITY_SILENCE_MS = 500;
const AUDIO_ACTIVITY_THRESHOLD = 0.02;
const LOG_SUMMARY_INTERVAL_MS = 5000;
const LOG_SUMMARY_HISTORY_LENGTH = 24;
const LOG_SUMMARY_BUCKET_SECONDS = Math.max(1, Math.round(LOG_SUMMARY_INTERVAL_MS / 1000));
const LOG_SUMMARY_LINE_EVENTS = 4;
const LOG_SUMMARY_LINE_COLORS = ['#1f6f5f', '#e0a03b', '#c2453b', '#5f5d58'];
const CAPTION_MAX_CHARS = 240;
const LIVE_COACH_SPEAK_DELAY_MS = 700;
const TURN_SUBMIT_COMMAND_PHRASES = ['submit my answer', 'how did i do'];
const COACH_QUESTION_PATTERN = /\b(what|why|how|tell me|can you|could you|describe|walk me|give me|share|would you)\b/i;
const QUESTION_STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not started' },
  { value: 'started', label: 'Started' },
  { value: 'answered', label: 'Answered' }
];
const QUESTION_STATUS_LOOKUP = new Map(
  QUESTION_STATUS_OPTIONS.map((option) => [option.value, option.label])
);

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

export function formatCount(value) {
  return typeof value === 'number' ? String(value) : '0';
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
  input.className = 'ui-field__input';
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

export function renderQuestions(list, questions, statuses, placeholder, onStatusChange) {
  list.innerHTML = '';
  if (!questions || questions.length === 0) {
    list.appendChild(placeholder);
    return;
  }

  questions.forEach((question, index) => {
    const statusEntry = statuses[index] || { status: 'not_started' };
    const statusValue = QUESTION_STATUS_LOOKUP.has(statusEntry.status)
      ? statusEntry.status
      : 'not_started';

    const li = document.createElement('li');
    li.className = `ui-list__item ui-question ui-question--${statusValue}`;
    li.dataset.index = String(index);

    const text = document.createElement('div');
    text.className = 'ui-question__text';
    text.textContent = question;

    const controls = document.createElement('div');
    controls.className = 'ui-question__controls';

    const select = document.createElement('select');
    select.className = 'ui-question__select';
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
        text: 'Waiting for live session to start.',
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
    ui.scoreSummary.textContent = 'Complete a session to view scoring insights.';
    ui.scoreStrengths.innerHTML = '';
    ui.scoreImprovements.innerHTML = '';
    return;
  }

  ui.scoreValue.textContent = String(score.overall_score ?? '--');
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
    label: 'Job Description (PDF)',
    helpText: 'Add the role description (PDF, DOCX, or TXT).',
    testId: 'job-file'
  });

  const status = document.createElement('p');
  status.className = 'ui-field__help';
  status.textContent = 'Waiting for documents.';

  const generateButton = createButton({
    label: 'Generate Questions',
    variant: 'secondary',
    size: 'md',
    disabled: true,
    attrs: { 'data-testid': 'generate-questions' }
  });

  function updateGenerateState() {
    const ready = resumeField.input.files.length > 0 && jobField.input.files.length > 0;
    generateButton.disabled = !ready;
  }

  resumeField.input.addEventListener('change', updateGenerateState);
  jobField.input.addEventListener('change', updateGenerateState);

  generateButton.addEventListener('click', async () => {
    if (generateButton.disabled) return;

    status.className = 'ui-field__help';
    status.textContent = 'Analyzing documents and generating questions...';
    generateButton.disabled = true;
    updateButtonLabel(generateButton, 'Generating...');
    state.interviewId = null;
    state.questions = [];
    state.questionStatuses = [];
    state.transcript = [];
    state.score = null;
    state.askedQuestionIndex = null;
    ui.startButton.disabled = true;
    renderQuestions(
      ui.questionList,
      state.questions,
      state.questionStatuses,
      ui.questionPlaceholder,
      ui.onQuestionStatusChange
    );
    renderTranscript(ui.transcriptList, state.transcript);
    renderScore(ui, null);

    try {
      const result = await createInterview({
        resumeFile: resumeField.input.files[0],
        jobFile: jobField.input.files[0]
      });

      state.interviewId = result.interview_id;
      state.questions = result.questions || [];
      state.questionStatuses = normalizeQuestionStatuses(state.questions, result.question_statuses);
      state.adapter = result.adapter || state.adapter;
      state.sessionName = '';
      state.askedQuestionIndex = result.asked_question_index ?? null;
      state.sessionStarted = false;
      renderQuestions(
        ui.questionList,
        state.questions,
        state.questionStatuses,
        ui.questionPlaceholder,
        ui.onQuestionStatusChange
      );
      ui.resetSessionState?.();
      ui.startButton.disabled = false;
      status.textContent = 'Questions ready. Start the live session when ready.';
      ui.adapterMeta.textContent = `Adapter: ${state.adapter}`;
      ui.updateMeta?.();
      if (ui.sessionNameInput) {
        ui.sessionNameInput.value = '';
      }
      if (ui.customQuestionInput) {
        ui.customQuestionInput.value = '';
      }
      ui.updateSessionToolsState?.();
      ui.refreshSessionList?.();
    } catch (error) {
      status.className = 'ui-field__error';
      status.textContent = error.message || 'Unable to generate questions.';
    } finally {
      updateButtonLabel(generateButton, 'Generate Questions');
      updateGenerateState();
    }
  });

  const content = document.createElement('div');
  content.className = 'layout-stack';
  content.appendChild(resumeField.wrapper);
  content.appendChild(jobField.wrapper);
  content.appendChild(generateButton);
  content.appendChild(status);

  ui.resumeInput = resumeField.input;
  ui.jobInput = jobField.input;
  ui.setupStatus = status;
  ui.generateButton = generateButton;

  return createPanel({
    title: 'Candidate Setup',
    subtitle: 'Upload PDFs to personalize the interview.',
    content,
    attrs: { 'data-testid': 'setup-panel' }
  });
}

function buildControlsPanel(state, ui, config) {
  const showAdvancedControls = Boolean(config?.uiDevMode);
  const statusPill = createStatusPill({
    label: 'Idle',
    tone: 'neutral',
    attrs: { 'data-testid': 'session-status' }
  });
  let modeSelect = null;

  const startButton = createButton({
    label: 'Start Interview',
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
    label: 'Interrupt On',
    variant: 'ghost',
    size: 'md',
    attrs: {
      'data-testid': 'barge-in-toggle',
      'aria-pressed': 'true'
    },
    onClick: () => {
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

  const sessionToolsButton = createButton({
    label: 'More',
    variant: 'ghost',
    size: 'sm',
    attrs: {
      'data-testid': 'session-tools-toggle',
      'aria-controls': 'session-tools-drawer',
      'aria-expanded': 'false'
    }
  });

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

  const meta = document.createElement('p');
  meta.className = 'ui-meta';
  meta.setAttribute('data-testid', 'adapter-meta');

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

  function applyVoiceMode(value) {
    const allowLiveMode = Boolean(config?.uiDevMode);
    const requestedMode = value === 'turn' ? 'turn' : 'live';
    const nextMode = allowLiveMode ? requestedMode : 'turn';
    state.voiceMode = nextMode;
    if (!allowLiveMode && modeSelect && modeSelect.value !== 'turn') {
      modeSelect.value = 'turn';
    }
    if (nextMode === 'turn') {
      bargeInButton.disabled = true;
      bargeInButton.setAttribute('aria-disabled', 'true');
    } else {
      bargeInButton.disabled = false;
      bargeInButton.removeAttribute('aria-disabled');
      state.liveAudioSeen = false;
      state.lastSpokenCoachText = '';
      cancelLiveCoachSpeech();
      resetTurnCompletionTracking();
      state.captionFinalText = '';
      state.captionDraftText = '';
    }
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

  function updateMeta() {
    const sessionLabel = state.sessionName ? ` | Session: ${state.sessionName}` : '';
    const outputLabel = `Output: ${voiceOutputModeLabel()}`;
    const modelLabel = isTurnMode()
      ? `Text: ${state.textModel || 'unknown'} | TTS: ${state.ttsModel || 'unknown'}`
      : `Live: ${state.liveModel || 'unknown'}`;
    const devModeLabel = config?.uiDevMode ? ' | mode: Develop mode' : '';
    meta.textContent = `Adapter: ${state.adapter} | Voice: ${voiceModeLabel()} | ${modelLabel} | ${outputLabel}${sessionLabel}${devModeLabel}`;
  }

  updateMeta();

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

  applyVoiceMode(state.voiceMode);
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

  function stripSubmitCommandSuffix(value) {
    const original = String(value || '').trim();
    if (!original) {
      return { text: '', command: null };
    }
    const lowered = normalizeTurnText(original);
    for (const phrase of TURN_SUBMIT_COMMAND_PHRASES) {
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

  function updateTurnSubmitUI() {
    const showRow = isTurnMode() && state.sessionActive;
    if (ui.turnActionsRow) {
      ui.turnActionsRow.hidden = !showRow;
    }
    if (!ui.submitTurnButton) {
      return;
    }
    if (!showRow) {
      ui.submitTurnButton.disabled = true;
      return;
    }
    const hasAnswer = String(state.captionDraftText || state.captionFinalText || '').trim().length > 0;
    ui.submitTurnButton.disabled = !(state.turnAwaitingAnswer && hasAnswer && state.turnReadyToSubmit);
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
        const stripped = stripSubmitCommandSuffix(merged);
        state.captionFinalText = stripped.text;
        if (stripped.command) {
          state.turnReadyToSubmit = true;
          updateTurnSubmitUI();
          if ((stripped.text || '').trim().length > 0) {
            submitTurnAnswer({ source: `voice_command:${normalizeTurnText(stripped.command).replace(/\s+/g, '_')}` });
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

  function stopSpeechRecognition() {
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
    state.captionFinalText = '';
    state.captionDraftText = '';
    setCaptionText('Captions idle.');
  }

  function cancelSpeechSynthesis() {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      state.turnSpeaking = false;
      return;
    }
    window.speechSynthesis.cancel();
    state.turnSpeaking = false;
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

  async function playCoachAudio(base64, mimeType) {
    const audioBytes = decodeBase64Audio(base64);
    if (!audioBytes || audioBytes.length === 0 || typeof Audio === 'undefined') {
      return false;
    }

    return new Promise((resolve) => {
      cancelSpeechSynthesis();
      state.turnSpeaking = true;
      stopSpeechRecognition();

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
        state.turnSpeaking = false;
        if (state.sessionActive && !state.isMuted) {
          startSpeechRecognition();
        }
        resolve(started);
      };

      audio.onended = finish;
      audio.onerror = finish;
      audio.onabort = finish;
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
      if (!preserveCaptions) {
        stopSpeechRecognition();
      }
      const utterance = new SpeechSynthesisUtterance(reply);
      utterance.lang = state.voiceTtsLanguage || 'en-US';
      utterance.onend = () => {
        state.turnSpeaking = false;
        if (restartRecognition && state.sessionActive && !state.isMuted) {
          startSpeechRecognition();
        }
        resolve();
      };
      utterance.onerror = () => {
        state.turnSpeaking = false;
        if (restartRecognition && state.sessionActive && !state.isMuted) {
          startSpeechRecognition();
        }
        resolve();
      };
      window.speechSynthesis.speak(utterance);
    });
  }

  async function playCoachReply({ text, audio, audioMime } = {}) {
    const reply = (text || '').trim();
    const outputMode = normalizeVoiceOutputMode(state.voiceOutputMode);
    let played = false;
    if (audio && outputMode !== 'browser') {
      played = await playCoachAudio(audio, audioMime);
    }
    if (!played && reply) {
      await speakCoachReply(reply);
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
    const sampleRate = payload?.sample_rate || 24000;
    if (!state.audioPlayback || state.audioPlaybackSampleRate !== sampleRate) {
      state.audioPlayback?.stop();
      state.audioPlayback = createAudioPlayback({ sampleRate });
      state.audioPlaybackSampleRate = sampleRate;
      state.audioPlayback.resume();
    }
    state.audioPlayback.play(pcm16);
  }

  function ensureE2eCandidatePlayback(sampleRate = 24000) {
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
    try {
      const response = await sendVoiceTurn({
        interviewId: state.interviewId,
        text: nextTurn,
        textModel: state.textModel,
        ttsModel: state.ttsModel
      });
      appendTranscriptEntry(state, response.candidate);
      appendTranscriptEntry(state, response.coach);
      renderTranscript(ui.transcriptList, state.transcript);
      ui.autoStartNextQuestion?.(response.coach.role);
      ui.updateSessionToolsState?.();
      state.turnAwaitingAnswer = coachHasQuestion(response.coach.text);
      state.lastCoachQuestion = state.turnAwaitingAnswer ? response.coach.text : '';
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
    state.turnSpeaking = false;
    cancelLiveCoachSpeech();
    state.liveAudioSeen = false;
    state.lastSpokenCoachText = '';
    state.lastCoachQuestion = '';
    clearGeminiReconnect(state);
    stopAudioBuffer(state);
    stopE2eCandidatePlayback();
    setMuteState(false);
    renderTranscript(ui.transcriptList, state.transcript);
    renderScore(ui, null);
    updateTurnSubmitUI();
    ui.updateSessionToolsState?.();
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
            ensureE2eCandidatePlayback(24000).play(payload);
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
      state.audioCapture = await startMicrophoneCapture({
        targetSampleRate: 24000,
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
        state.audioPlayback = createAudioPlayback({ sampleRate: 24000 });
        state.audioPlaybackSampleRate = 24000;
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
    stopButton.disabled = true;
    updateStatusPill(statusPill, { label: 'Scoring', tone: 'info' });
    renderScore(ui, {
      overall_score: '--',
      summary: 'Scoring… This can take ~20 seconds.',
      strengths: [],
      improvements: []
    });
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
      state.score = score;
      renderScore(ui, score);
      updateStatusPill(statusPill, { label: 'Complete', tone: 'success' });
      ui.scorePanel?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      ui.scorePanel?.focus?.({ preventScroll: true });
    } catch (error) {
      updateStatusPill(statusPill, { label: 'Score Error', tone: 'danger' });
      ui.scoreValue.textContent = '--';
      ui.scoreSummary.textContent = error?.message || 'Scoring failed.';
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
  if (showAdvancedControls) {
    actionsRow.appendChild(bargeInButton);
  }

  const turnActionsRow = document.createElement('div');
  turnActionsRow.className = 'ui-controls__row';
  turnActionsRow.appendChild(submitTurnButton);

  const modeRow = document.createElement('div');
  modeRow.className = 'ui-controls__row';

  const allowLiveMode = Boolean(config?.uiDevMode);
  const modeLabel = document.createElement('label');
  modeLabel.className = 'ui-field__label';
  modeLabel.textContent = 'Voice mode';
  if (allowLiveMode) {
    modeLabel.setAttribute('for', 'voice-mode-select');
  }

  modeRow.appendChild(modeLabel);

  if (allowLiveMode) {
    modeSelect = document.createElement('select');
    modeSelect.className = 'ui-field__input';
    modeSelect.id = 'voice-mode-select';
    modeSelect.setAttribute('data-testid', 'voice-mode-select');

    const modeOptions = [
      { value: 'turn', label: 'Turn-based (TTS)' },
      { value: 'live', label: 'Live (streaming)' }
    ];
    modeOptions.forEach((option) => {
      const opt = document.createElement('option');
      opt.value = option.value;
      opt.textContent = option.label;
      modeSelect.appendChild(opt);
    });
    modeSelect.value = state.voiceMode;
    modeSelect.addEventListener('change', async () => {
      const nextMode = modeSelect.value;
      if (state.sessionActive) {
        await endLiveSession({ label: 'Mode changed', tone: 'warning', allowRestart: true });
        resetSessionState();
      }
      applyVoiceMode(nextMode);
    });
    modeRow.appendChild(modeSelect);
  } else {
    modeSelect = null;
    const modeValue = document.createElement('div');
    modeValue.className = 'ui-field__input';
    modeValue.setAttribute('data-testid', 'voice-mode-value');
    modeValue.textContent = 'Turn-based (TTS)';
    modeRow.appendChild(modeValue);
  }

  const toolsRow = document.createElement('div');
  toolsRow.className = 'ui-controls__row ui-controls__row--tools';
  toolsRow.appendChild(sessionToolsButton);

  const content = document.createElement('div');
  content.className = 'layout-stack';
  content.appendChild(statusPill);
  content.appendChild(actionsRow);
  content.appendChild(turnActionsRow);
  content.appendChild(modeRow);
  content.appendChild(toolsRow);
  content.appendChild(meta);

  ui.statusPill = statusPill;
  ui.startButton = startButton;
  ui.stopButton = stopButton;
  ui.muteButton = muteButton;
  ui.bargeInToggle = bargeInButton;
  ui.submitTurnButton = submitTurnButton;
  ui.turnActionsRow = turnActionsRow;
  ui.sessionToolsToggle = sessionToolsButton;
  ui.adapterMeta = meta;
  ui.updateMeta = updateMeta;
  ui.applyModelOverrides = applyModelOverrides;
  ui.resetModelOverrides = resetModelOverrides;
  ui.applyVoiceOutputMode = applyVoiceOutputMode;
  ui.resetSessionState = resetSessionState;
  updateTurnSubmitUI();

  return createPanel({
    title: 'Session Controls',
    subtitle: 'Voice-only mode',
    content,
    attrs: { 'data-testid': 'controls-panel' }
  });
}

function buildSessionToolsDrawer(state, ui, config) {
  const showAdvancedControls = Boolean(config?.uiDevMode);
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

  const title = document.createElement('h3');
  title.className = 'ui-drawer__title';
  title.textContent = 'More';

  const closeButton = createButton({
    label: 'Close',
    variant: 'ghost',
    size: 'sm',
    attrs: {
      'data-testid': 'session-tools-close',
      'aria-label': 'Close Session Tools'
    }
  });

  header.appendChild(title);
  header.appendChild(closeButton);

  const sessionSection = document.createElement('section');
  sessionSection.className = 'ui-drawer__section';

  const sessionLabel = document.createElement('label');
  sessionLabel.className = 'ui-field__label';
  sessionLabel.textContent = 'Load session';

  const sessionSelect = document.createElement('select');
  sessionSelect.className = 'ui-field__input';
  sessionSelect.setAttribute('data-testid', 'session-select');

  const sessionLoad = createButton({
    label: 'Load session',
    variant: 'secondary',
    size: 'sm',
    disabled: true,
    attrs: { 'data-testid': 'session-load' }
  });

  const sessionHelp = document.createElement('p');
  sessionHelp.className = 'ui-field__help';
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

  const nameInput = document.createElement('input');
  nameInput.className = 'ui-field__input';
  nameInput.type = 'text';
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
  nameHelp.className = 'ui-field__help';
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

  const exportFormat = document.createElement('select');
  exportFormat.className = 'ui-field__input';
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
  exportHelp.className = 'ui-field__help';
  exportHelp.textContent = 'Enabled after transcript exists.';

  exportSection.appendChild(exportLabel);
  exportSection.appendChild(exportFormat);
  exportSection.appendChild(exportButton);
  exportSection.appendChild(exportHelp);

  drawer.appendChild(header);
  drawer.appendChild(sessionSection);
  drawer.appendChild(nameSection);
  drawer.appendChild(exportSection);

  if (showAdvancedControls) {
    const advancedTitle = document.createElement('h3');
    advancedTitle.className = 'ui-drawer__title';
    advancedTitle.textContent = 'Advanced';

    const modelSection = document.createElement('section');
    modelSection.className = 'ui-drawer__section';

    const liveModelLabel = document.createElement('label');
    liveModelLabel.className = 'ui-field__label';
    liveModelLabel.textContent = 'Live model';

    const liveModelInput = document.createElement('input');
    liveModelInput.className = 'ui-field__input';
    liveModelInput.type = 'text';
    liveModelInput.placeholder = 'e.g. gemini-3-flash-preview';
    liveModelInput.value = state.liveModel || '';
    liveModelInput.setAttribute('data-testid', 'live-model-input');

    const liveModelHelp = document.createElement('p');
    liveModelHelp.className = 'ui-field__help';
    liveModelHelp.textContent = 'Used for streaming sessions.';

    const textModelLabel = document.createElement('label');
    textModelLabel.className = 'ui-field__label';
    textModelLabel.textContent = 'Turn text model';

    const textModelInput = document.createElement('input');
    textModelInput.className = 'ui-field__input';
    textModelInput.type = 'text';
    textModelInput.placeholder = 'e.g. gemini-3-flash-preview';
    textModelInput.value = state.textModel || '';
    textModelInput.setAttribute('data-testid', 'text-model-input');

    const textModelHelp = document.createElement('p');
    textModelHelp.className = 'ui-field__help';
    textModelHelp.textContent = 'Used for turn-based coaching.';

    const ttsModelLabel = document.createElement('label');
    ttsModelLabel.className = 'ui-field__label';
    ttsModelLabel.textContent = 'Turn TTS model';

    const ttsModelInput = document.createElement('input');
    ttsModelInput.className = 'ui-field__input';
    ttsModelInput.type = 'text';
    ttsModelInput.placeholder = 'e.g. gemini-2.5-pro-preview-tts';
    ttsModelInput.value = state.ttsModel || '';
    ttsModelInput.setAttribute('data-testid', 'tts-model-input');

    const ttsModelHelp = document.createElement('p');
    ttsModelHelp.className = 'ui-field__help';
    ttsModelHelp.textContent = 'Used for turn-based voice output.';

    const voiceOutputLabel = document.createElement('label');
    voiceOutputLabel.className = 'ui-field__label';
    voiceOutputLabel.textContent = 'Coach audio output';

    const voiceOutputSelect = document.createElement('select');
    voiceOutputSelect.className = 'ui-field__input';
    voiceOutputSelect.setAttribute('data-testid', 'voice-output-select');

    [
      { value: 'auto', label: 'Auto (prefer server audio)' },
      { value: 'browser', label: 'Browser TTS' },
      { value: 'server', label: 'Server audio only' }
    ].forEach((option) => {
      const opt = document.createElement('option');
      opt.value = option.value;
      opt.textContent = option.label;
      voiceOutputSelect.appendChild(opt);
    });
    voiceOutputSelect.value = state.voiceOutputMode || 'auto';

    const voiceOutputHelp = document.createElement('p');
    voiceOutputHelp.className = 'ui-field__help';
    voiceOutputHelp.textContent = 'Auto falls back to browser speech if server audio is missing.';

    const resetModelsRow = document.createElement('div');
    resetModelsRow.className = 'ui-drawer__row';

    const resetModelsButton = createButton({
      label: 'Reset models',
      variant: 'ghost',
      size: 'sm',
      attrs: { 'data-testid': 'reset-models' }
    });

    resetModelsRow.appendChild(resetModelsButton);

    modelSection.appendChild(liveModelLabel);
    modelSection.appendChild(liveModelInput);
    modelSection.appendChild(liveModelHelp);
    modelSection.appendChild(textModelLabel);
    modelSection.appendChild(textModelInput);
    modelSection.appendChild(textModelHelp);
    modelSection.appendChild(ttsModelLabel);
    modelSection.appendChild(ttsModelInput);
    modelSection.appendChild(ttsModelHelp);
    modelSection.appendChild(voiceOutputLabel);
    modelSection.appendChild(voiceOutputSelect);
    modelSection.appendChild(voiceOutputHelp);
    modelSection.appendChild(resetModelsRow);

    const questionSection = document.createElement('section');
    questionSection.className = 'ui-drawer__section';

    const questionLabel = document.createElement('label');
    questionLabel.className = 'ui-field__label';
    questionLabel.textContent = 'Add known question';

    const questionInput = document.createElement('textarea');
    questionInput.className = 'ui-field__input ui-field__input--textarea';
    questionInput.placeholder = 'Paste the question the interviewer will ask.';
    questionInput.setAttribute('data-testid', 'custom-question-input');

    const positionLabel = document.createElement('label');
    positionLabel.className = 'ui-field__label';
    positionLabel.textContent = 'Insert position';

    const positionInput = document.createElement('input');
    positionInput.className = 'ui-field__input ui-field__input--number';
    positionInput.type = 'number';
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
    questionHelp.className = 'ui-field__help';
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
    restartLabel.textContent = 'Restart interview';

    const restartButton = createButton({
      label: 'Restart',
      variant: 'ghost',
      size: 'sm',
      disabled: true,
      attrs: { 'data-testid': 'restart-interview' }
    });

    const restartHelp = document.createElement('p');
    restartHelp.className = 'ui-field__help';
    restartHelp.textContent = 'Enabled after a session starts.';

    restartSection.appendChild(restartLabel);
    restartSection.appendChild(restartButton);
    restartSection.appendChild(restartHelp);

    drawer.appendChild(advancedTitle);
    drawer.appendChild(modelSection);
    drawer.appendChild(questionSection);
    drawer.appendChild(restartSection);

    ui.liveModelInput = liveModelInput;
    ui.liveModelHelp = liveModelHelp;
    ui.textModelInput = textModelInput;
    ui.textModelHelp = textModelHelp;
    ui.ttsModelInput = ttsModelInput;
    ui.ttsModelHelp = ttsModelHelp;
    ui.voiceOutputSelect = voiceOutputSelect;
    ui.voiceOutputHelp = voiceOutputHelp;
    ui.resetModelsButton = resetModelsButton;
    ui.customQuestionInput = questionInput;
    ui.customQuestionPosition = positionInput;
    ui.customQuestionAdd = addOnly;
    ui.customQuestionAddJump = addAndJump;
    ui.customQuestionHelp = questionHelp;
    ui.restartButton = restartButton;
    ui.restartHelp = restartHelp;
  }

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

  const placeholder = createListPlaceholder('Questions will appear after setup.');
  list.appendChild(placeholder);

  ui.questionList = list;
  ui.questionPlaceholder = placeholder;

  return createPanel({
    title: 'Interview Questions',
    subtitle: 'Generated from the resume and role.',
    content: list,
    attrs: { 'data-testid': 'questions-panel' }
  });
}

function buildTranscriptPanel(ui) {
  const container = document.createElement('div');
  container.className = 'layout-stack';

  const captions = document.createElement('div');
  captions.className = 'ui-caption';

  const captionLabel = document.createElement('div');
  captionLabel.className = 'ui-caption__label';
  captionLabel.textContent = 'Live captions (local, en-US)';

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

  return createPanel({
    title: 'Live Transcript',
    subtitle: 'Streaming once the session starts.',
    content: container,
    attrs: { 'data-testid': 'transcript-panel' }
  });
}

function buildLogHistogram(ui) {
  const container = document.createElement('div');
  container.className = 'layout-stack';

  const eventCard = document.createElement('div');
  eventCard.className = 'ui-log-histogram';

  const eventHeader = document.createElement('div');
  eventHeader.className = 'ui-log-histogram__header';

  const eventLabel = document.createElement('div');
  eventLabel.className = 'ui-log-histogram__label';
  eventLabel.textContent = `Event heartbeat (${LOG_SUMMARY_BUCKET_SECONDS}s buckets)`;

  const legend = document.createElement('div');
  legend.className = 'ui-log-lines__legend';

  eventHeader.appendChild(eventLabel);
  eventHeader.appendChild(legend);

  const chart = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  chart.classList.add('ui-log-lines__chart');
  chart.setAttribute('viewBox', '0 0 100 40');
  chart.setAttribute('preserveAspectRatio', 'none');

  eventCard.appendChild(eventHeader);
  eventCard.appendChild(chart);

  const errorCard = document.createElement('div');
  errorCard.className = 'ui-log-histogram';

  const errorLabel = document.createElement('div');
  errorLabel.className = 'ui-log-histogram__label';
  errorLabel.textContent = `Error heartbeat (${LOG_SUMMARY_BUCKET_SECONDS}s buckets)`;

  const errorBars = document.createElement('div');
  errorBars.className = 'ui-log-histogram__bars ui-log-histogram__bars--errors';

  errorCard.appendChild(errorLabel);
  errorCard.appendChild(errorBars);

  container.appendChild(eventCard);
  container.appendChild(errorCard);

  ui.logEventChart = chart;
  ui.logEventLegend = legend;
  ui.logErrorBars = errorBars;

  return container;
}

function buildLogDashboardPanel(ui) {
  const container = document.createElement('div');
  container.className = 'layout-stack';

  const grid = document.createElement('div');
  grid.className = 'ui-metrics-grid';

  function buildCard(label) {
    const card = document.createElement('div');
    card.className = 'ui-metric-card';

    const labelEl = document.createElement('div');
    labelEl.className = 'ui-metric-card__label';
    labelEl.textContent = label;

    const valueEl = document.createElement('div');
    valueEl.className = 'ui-metric-card__value';
    valueEl.textContent = '0';

    card.appendChild(labelEl);
    card.appendChild(valueEl);
    return { card, valueEl };
  }

  const clientDisconnects = buildCard('Client disconnects');
  const serverDisconnects = buildCard('Server disconnects');
  const geminiDisconnects = buildCard('Gemini disconnects');
  const turnCompletionChecks = buildCard('Turn completion checks');
  const errors = buildCard('Errors');
  const errorSessions = buildCard('Error sessions');

  grid.appendChild(clientDisconnects.card);
  grid.appendChild(serverDisconnects.card);
  grid.appendChild(geminiDisconnects.card);
  grid.appendChild(turnCompletionChecks.card);
  grid.appendChild(errors.card);
  grid.appendChild(errorSessions.card);

  ui.metricsCards = {
    clientDisconnects: clientDisconnects.valueEl,
    serverDisconnects: serverDisconnects.valueEl,
    geminiDisconnects: geminiDisconnects.valueEl,
    turnCompletionChecks: turnCompletionChecks.valueEl,
    errors: errors.valueEl,
    errorSessions: errorSessions.valueEl
  };

  container.appendChild(grid);
  container.appendChild(buildLogHistogram(ui));

  return createPanel({
    title: 'Live Stats',
    subtitle: 'Live log summary while the session runs.',
    content: container,
    attrs: { 'data-testid': 'log-dashboard' }
  });
}

function buildScorePanel(ui) {
  const scoreValue = document.createElement('div');
  scoreValue.className = 'ui-score__value';
  scoreValue.setAttribute('data-testid', 'score-value');

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

  const container = document.createElement('div');
  container.className = 'ui-score';
  container.setAttribute('data-testid', 'score-summary');
  container.appendChild(scoreValue);
  container.appendChild(scoreSummary);
  container.appendChild(strengthsLabel);
  container.appendChild(strengthsList);
  container.appendChild(improvementsLabel);
  container.appendChild(improvementsList);

  ui.scoreValue = scoreValue;
  ui.scoreSummary = scoreSummary;
  ui.scoreStrengths = strengthsList;
  ui.scoreImprovements = improvementsList;

  renderScore(ui, null);

  const panel = createPanel({
    title: 'Score Summary',
    subtitle: 'Full transcript and coaching highlights.',
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
    transcript: [],
    score: null,
    adapter: config.adapter,
    voiceMode: config.uiDevMode ? config.voiceMode : 'turn',
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
    logSummaryTimer: null,
    logSummaryEventTotals: {},
    logSummaryEventHistory: {},
    logSummaryLineEvents: [],
    logSummaryErrorTotal: null,
    logSummaryErrorHistory: [],
    turnQueue: [],
    turnRequestActive: false,
    turnSpeaking: false,
    turnAnswerStartedAt: null,
    turnCompletionLastCheckAt: 0,
    turnCompletionPending: false,
    liveAudioSeen: false,
    liveCoachPendingText: '',
    liveCoachSpeakTimer: null,
    lastSpokenCoachText: '',
    lastCoachQuestion: ''
  };

  const ui = {};
  if (typeof window !== 'undefined' && window.__E2E__) {
    window.__e2eState = state;
  }

  function syncQuestionStatuses(statuses) {
    state.questionStatuses = normalizeQuestionStatuses(state.questions, statuses);
    if (ui.questionList && ui.questionPlaceholder) {
      renderQuestions(ui.questionList, state.questions, state.questionStatuses, ui.questionPlaceholder, onQuestionStatusChange);
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
    renderQuestions(ui.questionList, state.questions, state.questionStatuses, ui.questionPlaceholder, onQuestionStatusChange);
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
      renderQuestions(ui.questionList, state.questions, state.questionStatuses, ui.questionPlaceholder, onQuestionStatusChange);
    }
  }

  function onQuestionStatusChange(index, status) {
    void setQuestionStatus(index, status, 'user');
  }

  ui.onQuestionStatusChange = onQuestionStatusChange;

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

  function padSamples(samples) {
    if (!Array.isArray(samples)) {
      return Array(LOG_SUMMARY_HISTORY_LENGTH).fill(0);
    }
    if (samples.length < LOG_SUMMARY_HISTORY_LENGTH) {
      return Array(LOG_SUMMARY_HISTORY_LENGTH - samples.length).fill(0).concat(samples);
    }
    return samples.slice(-LOG_SUMMARY_HISTORY_LENGTH);
  }

  function renderBarHistogram(bars, samples, label) {
    if (!bars) {
      return;
    }
    bars.innerHTML = '';
    const paddedSamples = padSamples(samples);
    const maxValue = Math.max(...paddedSamples, 1);
    paddedSamples.forEach((value) => {
      const bar = document.createElement('div');
      bar.className = 'ui-log-histogram__bar';
      bar.style.height = `${Math.round((value / maxValue) * 100)}%`;
      bar.title = `${value} ${label}`;
      bars.appendChild(bar);
    });
  }

  function pickLineEvents(eventCounts) {
    return Object.entries(eventCounts || {})
      .sort((left, right) => (Number(right[1]) || 0) - (Number(left[1]) || 0))
      .slice(0, LOG_SUMMARY_LINE_EVENTS)
      .map(([name]) => name);
  }

  function renderEventLegend(series) {
    if (!ui.logEventLegend) {
      return;
    }
    ui.logEventLegend.innerHTML = '';
    if (!series.length) {
      const empty = document.createElement('div');
      empty.className = 'ui-log-lines__empty';
      empty.textContent = 'No event activity yet.';
      ui.logEventLegend.appendChild(empty);
      return;
    }
    series.forEach(({ name, color }) => {
      const item = document.createElement('div');
      item.className = 'ui-log-lines__item';

      const swatch = document.createElement('span');
      swatch.className = 'ui-log-lines__swatch';
      swatch.style.backgroundColor = color;

      const label = document.createElement('span');
      label.className = 'ui-log-lines__name';
      label.textContent = name;

      item.appendChild(swatch);
      item.appendChild(label);
      ui.logEventLegend.appendChild(item);
    });
  }

  function renderEventLines(series) {
    if (!ui.logEventChart) {
      return;
    }
    const svg = ui.logEventChart;
    const width = 100;
    const height = 40;
    svg.innerHTML = '';
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const baseline = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    baseline.setAttribute('x1', '0');
    baseline.setAttribute('x2', String(width));
    baseline.setAttribute('y1', String(height));
    baseline.setAttribute('y2', String(height));
    baseline.setAttribute('class', 'ui-log-lines__baseline');
    svg.appendChild(baseline);

    if (!series.length) {
      return;
    }

    const paddedSeries = series.map((entry) => ({
      ...entry,
      values: padSamples(entry.values)
    }));
    const maxValue = Math.max(
      ...paddedSeries.flatMap((entry) => entry.values),
      1
    );
    paddedSeries.forEach((entry) => {
      const points = entry.values
        .map((value, index) => {
          const x = (index / (LOG_SUMMARY_HISTORY_LENGTH - 1)) * width;
          const y = height - (value / maxValue) * height;
          return `${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(' ');
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      line.setAttribute('points', points);
      line.setAttribute('fill', 'none');
      line.setAttribute('stroke', entry.color);
      line.setAttribute('stroke-width', '2');
      line.setAttribute('stroke-linejoin', 'round');
      line.setAttribute('stroke-linecap', 'round');
      svg.appendChild(line);
    });
  }

  function updateEventSeries(eventName, total, totals, histories) {
    const previous = totals[eventName];
    if (previous === undefined || total < previous) {
      totals[eventName] = total;
      histories[eventName] = [0];
      return;
    }
    const delta = total - previous;
    totals[eventName] = total;
    if (!Array.isArray(histories[eventName])) {
      histories[eventName] = [];
    }
    histories[eventName].push(delta);
    if (histories[eventName].length > LOG_SUMMARY_HISTORY_LENGTH) {
      histories[eventName].splice(0, histories[eventName].length - LOG_SUMMARY_HISTORY_LENGTH);
    }
  }

  function updateErrorSeries(errorCount) {
    if (state.logSummaryErrorTotal === null || errorCount < state.logSummaryErrorTotal) {
      state.logSummaryErrorTotal = errorCount;
      state.logSummaryErrorHistory = [0];
      return;
    }
    const delta = errorCount - state.logSummaryErrorTotal;
    state.logSummaryErrorTotal = errorCount;
    if (!Array.isArray(state.logSummaryErrorHistory)) {
      state.logSummaryErrorHistory = [];
    }
    state.logSummaryErrorHistory.push(delta);
    if (state.logSummaryErrorHistory.length > LOG_SUMMARY_HISTORY_LENGTH) {
      state.logSummaryErrorHistory.splice(0, state.logSummaryErrorHistory.length - LOG_SUMMARY_HISTORY_LENGTH);
    }
  }

  function getErrorEventCount(summary) {
    if (typeof summary?.error_event_count === 'number') {
      return summary.error_event_count;
    }
    const errorCount = summary?.error_count || 0;
    return errorCount;
  }

  function updateLogCharts(summary) {
    const eventCounts = summary?.event_counts || {};
    const totals = state.logSummaryEventTotals || {};
    const histories = state.logSummaryEventHistory || {};

    Object.entries(eventCounts).forEach(([eventName, count]) => {
      updateEventSeries(eventName, Number(count) || 0, totals, histories);
    });

    state.logSummaryEventTotals = totals;
    state.logSummaryEventHistory = histories;

    const lineEvents = pickLineEvents(eventCounts);
    state.logSummaryLineEvents = lineEvents;
    const series = lineEvents.map((eventName, index) => ({
      name: eventName,
      color: LOG_SUMMARY_LINE_COLORS[index % LOG_SUMMARY_LINE_COLORS.length],
      values: histories[eventName] || []
    }));
    renderEventLegend(series);
    renderEventLines(series);

    updateErrorSeries(getErrorEventCount(summary));
    renderBarHistogram(ui.logErrorBars, state.logSummaryErrorHistory, 'errors');
  }

  async function refreshLogSummary() {
    if (!ui.metricsCards) {
      return;
    }
    try {
      const summary = await getLogSummary();
      const clientDisconnects = summary.client_disconnects || 0;
      const serverDisconnects = summary.server_disconnects || 0;
      const geminiDisconnects = summary.gemini_disconnects || 0;
      const turnCompletionChecks = summary.turn_completion_checks || 0;
      const errors = getErrorEventCount(summary);
      const errorSessions = summary.error_session_count || 0;
      ui.metricsCards.clientDisconnects.textContent = formatCount(clientDisconnects);
      ui.metricsCards.serverDisconnects.textContent = formatCount(serverDisconnects);
      ui.metricsCards.geminiDisconnects.textContent = formatCount(geminiDisconnects);
      ui.metricsCards.turnCompletionChecks.textContent = formatCount(turnCompletionChecks);
      ui.metricsCards.errors.textContent = formatCount(errors);
      ui.metricsCards.errorSessions.textContent = formatCount(errorSessions);
      updateLogCharts(summary);
    } catch (error) {
      // Ignore polling errors to keep the UI responsive.
    }
  }

  function startLogSummaryPolling() {
    if (state.logSummaryTimer) {
      return;
    }
    void refreshLogSummary();
    state.logSummaryTimer = window.setInterval(() => {
      void refreshLogSummary();
    }, LOG_SUMMARY_INTERVAL_MS);
  }

  const leftColumn = document.createElement('div');
  leftColumn.className = 'layout-stack';
  leftColumn.appendChild(buildSetupPanel(state, ui));
  leftColumn.appendChild(buildControlsPanel(state, ui, config));

  const rightColumn = document.createElement('div');
  rightColumn.className = 'layout-stack';
  rightColumn.appendChild(buildQuestionsPanel(ui));
  rightColumn.appendChild(buildTranscriptPanel(ui));
  if (config.uiDevMode) {
    rightColumn.appendChild(buildLogDashboardPanel(ui));
  }
  rightColumn.appendChild(buildScorePanel(ui));

  const layout = document.createElement('main');
  layout.className = 'layout-split';
  layout.appendChild(leftColumn);
  layout.appendChild(rightColumn);

  const { drawer, backdrop } = buildSessionToolsDrawer(state, ui, config);
  layout.appendChild(drawer);
  layout.appendChild(backdrop);

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
      ui.sessionHelp.textContent = 'Stop the live session before loading another.';
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
      state.adapter = summary.adapter || state.adapter;
      state.sessionName = summary.session_name || '';
      state.askedQuestionIndex = summary.asked_question_index ?? null;
      state.sessionStarted = state.transcript.length > 0 || hasScore;
      state.sessionActive = false;
      state.sessionId = null;
      state.liveMode = null;
      clearGeminiReconnect(state);

      renderQuestions(
        ui.questionList,
        state.questions,
        state.questionStatuses,
        ui.questionPlaceholder,
        ui.onQuestionStatusChange
      );
      renderTranscript(ui.transcriptList, state.transcript);
      renderScore(ui, state.score);

      if (ui.sessionNameInput) {
        ui.sessionNameInput.value = state.sessionName;
      }
      if (ui.sessionNameHelp) {
        ui.sessionNameHelp.textContent = state.sessionName
          ? 'Session name loaded.'
          : 'Add a name to keep sessions organized.';
      }
      if (ui.setupStatus) {
        ui.setupStatus.className = 'ui-field__help';
        ui.setupStatus.textContent = 'Session loaded. Start the live session when ready.';
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
    const hasTranscript = state.transcript.length > 0;
    const canRestart = hasInterview && state.sessionStarted && !state.sessionActive;
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
    if (ui.restartButton) {
      ui.restartButton.disabled = !canRestart;
    }
    if (ui.exportTranscript) {
      updateButtonLabel(ui.exportTranscript, exportFormat === 'txt' ? 'Export TXT' : 'Export PDF');
    }

    if (ui.exportHelp) {
      ui.exportHelp.textContent = hasTranscript
        ? `Downloads the study guide ${exportFormat === 'txt' ? 'text file' : 'PDF'}.`
        : 'Enabled after transcript exists.';
    }
    if (ui.restartHelp) {
      ui.restartHelp.textContent = state.sessionActive
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

  ui.exportTranscript?.addEventListener('click', async () => {
    if (!state.interviewId) return;
    try {
      const format = ui.exportFormat?.value || 'pdf';
      const blob = await downloadStudyGuide({ interviewId: state.interviewId, format });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `interview-${state.interviewId}.${format === 'txt' ? 'txt' : 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      ui.exportHelp.textContent = 'Download started.';
    } catch (error) {
      ui.exportHelp.textContent = error.message || 'Unable to export PDF.';
    }
  });

  ui.restartButton?.addEventListener('click', async () => {
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
      ui.restartHelp.textContent = error.message || 'Unable to restart session.';
    } finally {
      updateSessionToolsState();
    }
  });

  updateSessionToolsState();
  if (config.uiDevMode) {
    startLogSummaryPolling();
  }

  return layout;
}

export function mountVoiceApp(root) {
  if (!root) return;
  root.innerHTML = '';
  root.appendChild(buildVoiceLayout());
}
