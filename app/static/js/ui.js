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
  listSessions,
  restartInterview,
  scoreInterview,
  startLiveSession,
  logClientEvent,
  updateQuestionStatus,
  updateSessionName
} from './api/client.js';
import { getAppConfig } from './config.js';
import { LiveTransport } from './transport.js';
import { createAudioPlayback, decodePcm16Base64, startMicrophoneCapture } from './voice.js';
import { renderMarkdownInto } from './markdown.js';

const STATUS_TONES = ['neutral', 'success', 'warning', 'danger', 'info'];
const GEMINI_RECONNECT_MAX_ATTEMPTS = 3;
const GEMINI_RECONNECT_DELAY_MS = 600;
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
    state.transport.start(state.interviewId, state.userId);
  }, GEMINI_RECONNECT_DELAY_MS);
  return true;
}

function sendClientEvent(state, event, { detail, status } = {}) {
  if (!state?.interviewId) return;
  logClientEvent({
    event,
    interviewId: state.interviewId,
    sessionId: state.sessionId,
    state: status,
    detail
  }).catch(() => {
    // Best-effort telemetry; ignore failures.
  });
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
  const statusPill = createStatusPill({
    label: 'Idle',
    tone: 'neutral',
    attrs: { 'data-testid': 'session-status' }
  });

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

  const sessionToolsButton = createButton({
    label: 'Session Tools',
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
  }

  const meta = document.createElement('p');
  meta.className = 'ui-meta';

  function updateMeta() {
    const sessionLabel = state.sessionName ? ` | Session: ${state.sessionName}` : '';
    meta.textContent = `Adapter: ${state.adapter} | Live: ${config.liveModel}${sessionLabel}`;
  }

  updateMeta();

  function resetSessionState() {
    state.transcript = [];
    state.score = null;
    state.sessionId = null;
    state.liveMode = null;
    state.sessionActive = false;
    clearGeminiReconnect(state);
    setMuteState(false);
    renderTranscript(ui.transcriptList, state.transcript);
    renderScore(ui, null);
    ui.updateSessionToolsState?.();
  }

  async function endLiveSession({ label, tone, allowRestart = false } = {}) {
    if (label && tone) {
      updateStatusPill(statusPill, { label, tone });
    }

    if (!state.sessionActive) {
      return;
    }

    state.sessionActive = false;
    clearGeminiReconnect(state);

    if (state.transport) {
      state.transport.stop();
      state.transport = null;
    }

    if (state.audioCapture) {
      await state.audioCapture.stop();
      state.audioCapture = null;
    }

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
          autoStartNextQuestion(entry.role);
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
              state.transport.start(state.interviewId, state.userId);
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
            clearGeminiReconnect(state);
            updateStatusPill(statusPill, { label: 'Live', tone: 'success' });
          }
          if (payload.state === 'thinking') {
            updateStatusPill(statusPill, { label: 'Thinking', tone: 'info' });
          }
          if (payload.state === 'gemini-error') {
            if (state.sessionActive) {
              void endLiveSession({ label: 'Live error', tone: 'danger', allowRestart: true });
            }
          }
          if (payload.state === 'gemini-disconnected') {
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
          appendTranscriptEntry(state, {
            role: payload.role,
            text: payload.text,
            timestamp: payload.timestamp
          });
          renderTranscript(ui.transcriptList, state.transcript);
          autoStartNextQuestion(payload.role);
          ui.updateSessionToolsState?.();
        },
        onAudio: (payload) => {
          const pcm16 = coercePcm16(payload);
          if (!pcm16) return;
          const sampleRate = payload?.sample_rate || 24000;
          if (!state.audioPlayback || state.audioPlaybackSampleRate !== sampleRate) {
            state.audioPlayback?.stop();
            state.audioPlayback = createAudioPlayback({ sampleRate });
            state.audioPlaybackSampleRate = sampleRate;
            state.audioPlayback.resume();
          }
          state.audioPlayback.play(pcm16);
        }
      });
    }

    await state.transport.connect();
  }

  async function startMicrophoneIfNeeded() {
    if (config.adapter === 'mock') {
      return;
    }

    try {
      state.audioCapture = await startMicrophoneCapture({
        targetSampleRate: 24000,
        onAudioFrame: (frame) => {
          if (!state.isMuted) {
            state.transport?.sendAudio(frame);
          }
        },
        onSpeechStart: () => {
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

    startButton.disabled = true;
    stopButton.disabled = false;
    updateStatusPill(statusPill, { label: 'Connecting', tone: 'info' });
    resetSessionState();
    state.sessionActive = true;
    state.sessionStarted = true;
    ui.updateSessionToolsState?.();

    try {
      await ensureTransport();
      if (!state.audioPlayback) {
        state.audioPlayback = createAudioPlayback({ sampleRate: 24000 });
        state.audioPlaybackSampleRate = 24000;
      }
      await state.audioPlayback.resume();
      state.transport.start(state.interviewId, state.userId);
      await startMicrophoneIfNeeded();
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
    clearGeminiReconnect(state);
    stopButton.disabled = true;
    updateStatusPill(statusPill, { label: 'Scoring', tone: 'info' });

    if (state.transport) {
      state.transport.stop();
      state.transport = null;
    }

    if (state.audioCapture) {
      await state.audioCapture.stop();
      state.audioCapture = null;
    }

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
    } catch (error) {
      updateStatusPill(statusPill, { label: 'Score Error', tone: 'danger' });
    } finally {
      startButton.disabled = true;
      setMuteState(false);
      ui.updateSessionToolsState?.();
    }
  });

  const actionsRow = document.createElement('div');
  actionsRow.className = 'ui-controls__row';
  actionsRow.appendChild(startButton);
  actionsRow.appendChild(stopButton);
  actionsRow.appendChild(muteButton);

  const toolsRow = document.createElement('div');
  toolsRow.className = 'ui-controls__row ui-controls__row--tools';
  toolsRow.appendChild(sessionToolsButton);

  const content = document.createElement('div');
  content.className = 'layout-stack';
  content.appendChild(statusPill);
  content.appendChild(actionsRow);
  content.appendChild(toolsRow);
  content.appendChild(meta);

  ui.statusPill = statusPill;
  ui.startButton = startButton;
  ui.stopButton = stopButton;
  ui.muteButton = muteButton;
  ui.sessionToolsToggle = sessionToolsButton;
  ui.adapterMeta = meta;
  ui.updateMeta = updateMeta;
  ui.resetSessionState = resetSessionState;

  return createPanel({
    title: 'Session Controls',
    subtitle: 'Voice-only mode',
    content,
    attrs: { 'data-testid': 'controls-panel' }
  });
}

function buildSessionToolsDrawer(state, ui) {
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
  title.textContent = 'Session Tools';

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

  drawer.appendChild(header);
  drawer.appendChild(sessionSection);
  drawer.appendChild(nameSection);
  drawer.appendChild(questionSection);
  drawer.appendChild(exportSection);
  drawer.appendChild(restartSection);

  ui.sessionToolsDrawer = drawer;
  ui.sessionToolsBackdrop = backdrop;
  ui.sessionToolsClose = closeButton;
  ui.sessionSelect = sessionSelect;
  ui.sessionLoad = sessionLoad;
  ui.sessionHelp = sessionHelp;
  ui.sessionNameInput = nameInput;
  ui.sessionNameSave = nameSave;
  ui.sessionNameHelp = nameHelp;
  ui.customQuestionInput = questionInput;
  ui.customQuestionPosition = positionInput;
  ui.customQuestionAdd = addOnly;
  ui.customQuestionAddJump = addAndJump;
  ui.customQuestionHelp = questionHelp;
  ui.exportFormat = exportFormat;
  ui.exportTranscript = exportButton;
  ui.exportHelp = exportHelp;
  ui.restartButton = restartButton;
  ui.restartHelp = restartHelp;

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
  const transcriptList = document.createElement('div');
  transcriptList.className = 'layout-stack ui-transcript__list';
  transcriptList.setAttribute('data-testid', 'transcript-list');

  renderTranscript(transcriptList, []);

  ui.transcriptList = transcriptList;

  return createPanel({
    title: 'Live Transcript',
    subtitle: 'Streaming once the session starts.',
    content: transcriptList,
    attrs: { 'data-testid': 'transcript-panel' }
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

  return createPanel({
    title: 'Score Summary',
    subtitle: 'Full transcript and coaching highlights.',
    content: container,
    attrs: { 'data-testid': 'score-panel' }
  });
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
    userId: config.userId,
    liveMode: null,
    transport: null,
    audioCapture: null,
    audioPlayback: null,
    audioPlaybackSampleRate: null,
    sessionActive: false,
    sessionStarted: false,
    isMuted: false,
    sessionName: '',
    askedQuestionIndex: null,
    sessions: [],
    geminiReconnectAttempts: 0,
    geminiReconnectTimer: null
  };

  const ui = {};

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

  const leftColumn = document.createElement('div');
  leftColumn.className = 'layout-stack';
  leftColumn.appendChild(buildSetupPanel(state, ui));
  leftColumn.appendChild(buildControlsPanel(state, ui, config));

  const rightColumn = document.createElement('div');
  rightColumn.className = 'layout-stack';
  rightColumn.appendChild(buildQuestionsPanel(ui));
  rightColumn.appendChild(buildTranscriptPanel(ui));
  rightColumn.appendChild(buildScorePanel(ui));

  const layout = document.createElement('main');
  layout.className = 'layout-split';
  layout.appendChild(leftColumn);
  layout.appendChild(rightColumn);

  const { drawer, backdrop } = buildSessionToolsDrawer(state, ui);
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

  return layout;
}

export function mountVoiceApp(root) {
  if (!root) return;
  root.innerHTML = '';
  root.appendChild(buildVoiceLayout());
}
