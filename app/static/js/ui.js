import {
  createButton,
  createPanel,
  createStatusPill,
  createTranscriptRow
} from './components/index.js';
import { createInterview, scoreInterview, startLiveSession } from './api/client.js';
import { getAppConfig } from './config.js';
import { LiveTransport } from './transport.js';
import { createAudioPlayback, decodePcm16Base64, startMicrophoneCapture } from './voice.js';

const STATUS_TONES = ['neutral', 'success', 'warning', 'danger', 'info'];

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
  input.accept = 'application/pdf';
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

  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'ui-list__item';
    li.textContent = item;
    list.appendChild(li);
  });
}

function renderTranscript(list, entries) {
  list.innerHTML = '';
  if (!entries || entries.length === 0) {
    list.appendChild(
      createTranscriptRow({
        role: 'system',
        text: 'Waiting for live session to start.',
        timestamp: ''
      })
    );
    return;
  }

  entries.forEach((entry) => {
    list.appendChild(
      createTranscriptRow({
        role: entry.role,
        text: entry.text,
        timestamp: entry.timestamp,
        isFinal: true
      })
    );
  });
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
  ui.scoreSummary.textContent = score.summary || 'Summary pending.';

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
    helpText: 'Upload the candidate resume to personalize questions.',
    testId: 'resume-file'
  });

  const jobField = createFileField({
    id: 'job-file',
    label: 'Job Description (PDF)',
    helpText: 'Add the role description to focus the interview.',
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
    state.transcript = [];
    state.score = null;
    ui.startButton.disabled = true;
    renderList(ui.questionList, state.questions, ui.questionPlaceholder);
    renderTranscript(ui.transcriptList, state.transcript);
    renderScore(ui, null);

    try {
      const result = await createInterview({
        resumeFile: resumeField.input.files[0],
        jobFile: jobField.input.files[0]
      });

      state.interviewId = result.interview_id;
      state.questions = result.questions || [];
      state.adapter = result.adapter || state.adapter;
      renderList(ui.questionList, state.questions, ui.questionPlaceholder);
      ui.startButton.disabled = false;
      status.textContent = 'Questions ready. Start the live session when ready.';
      ui.adapterMeta.textContent = `Adapter: ${state.adapter}`;
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

  const meta = document.createElement('p');
  meta.className = 'ui-meta';
  meta.textContent = `Adapter: ${state.adapter} | Live: ${config.liveModel}`;

  function resetSessionState() {
    state.transcript = [];
    state.score = null;
    state.sessionId = null;
    state.liveMode = null;
    renderTranscript(ui.transcriptList, state.transcript);
    renderScore(ui, null);
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
      const delay = config.adapter === 'mock' ? 120 : 220;
      live.mock_transcript.forEach((entry, index) => {
        window.setTimeout(() => {
          state.transcript.push(entry);
          renderTranscript(ui.transcriptList, state.transcript);
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
          updateStatusPill(statusPill, { label: 'Disconnected', tone: 'warning' });
        },
        onError: () => {
          updateStatusPill(statusPill, { label: 'Connection error', tone: 'danger' });
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
          if (payload.state === 'stream-complete') {
            updateStatusPill(statusPill, { label: 'Stream complete', tone: 'success' });
          }
          if (payload.state === 'stopped') {
            updateStatusPill(statusPill, { label: 'Stopped', tone: 'warning' });
          }
        },
        onTranscript: (payload) => {
          const entry = {
            role: payload.role,
            text: payload.text,
            timestamp: payload.timestamp
          };
          state.transcript.push(entry);
          renderTranscript(ui.transcriptList, state.transcript);
        },
        onAudio: (payload) => {
          const pcm16 = coercePcm16(payload);
          if (pcm16 && state.audioPlayback) {
            state.audioPlayback.play(pcm16);
          }
        }
      });
    }

    await state.transport.connect();
  }

  async function startMicrophoneIfNeeded() {
    if (config.adapter === 'mock') {
      return;
    }

    state.audioCapture = await startMicrophoneCapture({
      targetSampleRate: 24000,
      onAudioFrame: (frame) => {
        state.transport?.sendAudio(frame);
      },
      onStatus: () => {
        updateStatusPill(statusPill, { label: 'Mic ready', tone: 'info' });
      }
    });
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

    try {
      await ensureTransport();
      if (!state.audioPlayback) {
        state.audioPlayback = createAudioPlayback({ sampleRate: 24000 });
      }
      await state.audioPlayback.resume();
      await startMicrophoneIfNeeded();
      state.transport.start(state.interviewId);
    } catch (error) {
      updateStatusPill(statusPill, { label: 'Fallback', tone: 'warning' });
      try {
        await startMockFallback();
      } catch (fallbackError) {
        updateStatusPill(statusPill, { label: 'Error', tone: 'danger' });
        startButton.disabled = false;
        stopButton.disabled = true;
      }
    }
  });

  stopButton.addEventListener('click', async () => {
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
    }
  });

  const content = document.createElement('div');
  content.className = 'layout-stack';
  content.appendChild(statusPill);
  content.appendChild(startButton);
  content.appendChild(stopButton);
  content.appendChild(meta);

  ui.statusPill = statusPill;
  ui.startButton = startButton;
  ui.stopButton = stopButton;
  ui.adapterMeta = meta;

  return createPanel({
    title: 'Session Controls',
    subtitle: 'Voice-only mode',
    content,
    attrs: { 'data-testid': 'controls-panel' }
  });
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
  transcriptList.className = 'layout-stack';
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

  const scoreSummary = document.createElement('p');
  scoreSummary.className = 'ui-score__summary';

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
    transcript: [],
    score: null,
    adapter: config.adapter,
    liveMode: null,
    transport: null,
    audioCapture: null,
    audioPlayback: null
  };

  const ui = {};

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
  return layout;
}

export function mountVoiceApp(root) {
  if (!root) return;
  root.innerHTML = '';
  root.appendChild(buildVoiceLayout());
}
