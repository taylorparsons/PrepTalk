import { getAppConfig } from '../config.js';

function getApiBase() {
  const config = getAppConfig();
  return config.apiBase || '/api';
}

function getUserId() {
  const config = getAppConfig();
  return config.userId || 'local';
}

const ANON_ID_STORAGE_KEY = 'preptalk_telemetry_anonymous_id';
const FIRST_SEEN_STORAGE_KEY = 'preptalk_telemetry_first_seen_at';
const TELEMETRY_CONSENT_STORAGE_KEY = 'preptalk_telemetry_consent';

function safeGetStorage(key) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function safeSetStorage(key, value) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(key, value);
  } catch (error) {
    // Ignore storage errors in privacy-restricted contexts.
  }
}

function safeRemoveStorage(key) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(key);
  } catch (error) {
    // Ignore storage errors in privacy-restricted contexts.
  }
}

function normalizeTelemetryConsent(value) {
  const cleaned = String(value || '').trim().toLowerCase();
  if (cleaned === 'granted' || cleaned === 'accepted' || cleaned === 'yes' || cleaned === 'true' || cleaned === '1') {
    return 'granted';
  }
  if (cleaned === 'denied' || cleaned === 'declined' || cleaned === 'no' || cleaned === 'false' || cleaned === '0') {
    return 'denied';
  }
  return 'unknown';
}

function isTelemetryConsentRequired() {
  const config = getAppConfig();
  return config.telemetryConsentRequired === true;
}

export function getTelemetryConsentState() {
  if (!isTelemetryConsentRequired()) {
    return 'granted';
  }
  const stored = safeGetStorage(TELEMETRY_CONSENT_STORAGE_KEY);
  return normalizeTelemetryConsent(stored);
}

export function setTelemetryConsentState(value) {
  const normalized = normalizeTelemetryConsent(value);
  if (normalized === 'unknown') {
    safeRemoveStorage(TELEMETRY_CONSENT_STORAGE_KEY);
    return 'unknown';
  }
  safeSetStorage(TELEMETRY_CONSENT_STORAGE_KEY, normalized);
  return normalized;
}

export function canSendTelemetry() {
  if (!isTelemetryConsentRequired()) {
    return true;
  }
  return getTelemetryConsentState() === 'granted';
}

function createAnonymousId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const seed = Math.random().toString(36).slice(2, 10);
  return `anon-${Date.now()}-${seed}`;
}

function getTelemetryIdentity() {
  let anonymousId = safeGetStorage(ANON_ID_STORAGE_KEY);
  if (!anonymousId) {
    anonymousId = createAnonymousId();
    safeSetStorage(ANON_ID_STORAGE_KEY, anonymousId);
  }
  let newUser = false;
  const firstSeen = safeGetStorage(FIRST_SEEN_STORAGE_KEY);
  if (!firstSeen) {
    newUser = true;
    safeSetStorage(FIRST_SEEN_STORAGE_KEY, new Date().toISOString());
  }
  return { anonymousId, newUser };
}

function sanitizeProperties(properties) {
  if (!properties || typeof properties !== 'object') {
    return undefined;
  }
  const output = {};
  Object.entries(properties).forEach(([key, value]) => {
    if (!key) return;
    if (value === null || value === undefined) return;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      output[key] = value;
      return;
    }
    output[key] = String(value);
  });
  if (Object.keys(output).length === 0) {
    return undefined;
  }
  return output;
}

async function handleResponse(response) {
  if (response.ok) {
    return response.json();
  }

  let detail = response.statusText || 'Request failed';
  try {
    const payloadText = await response.text();
    if (payloadText) {
      try {
        const payload = JSON.parse(payloadText);
        if (payload?.detail) {
          detail = payload.detail;
        } else {
          detail = payloadText;
        }
      } catch (error) {
        detail = payloadText;
      }
    }
  } catch (error) {
    // Ignore parsing errors and fall back to status text.
  }

  throw new Error(detail || response.statusText || 'Request failed');
}

export async function createInterview({ resumeFile, jobFile, jobUrl, roleTitle }) {
  const formData = new FormData();
  formData.append('resume', resumeFile);
  if (jobFile) {
    formData.append('job_description', jobFile);
  }
  if (jobUrl) {
    formData.append('job_description_url', jobUrl);
  }
  if (roleTitle) {
    formData.append('role_title', roleTitle);
  }

  const response = await fetch(`${getApiBase()}/interviews`, {
    method: 'POST',
    headers: { 'X-User-Id': getUserId() },
    body: formData
  });

  return handleResponse(response);
}

export async function startLiveSession({ interviewId }) {
  const response = await fetch(`${getApiBase()}/live/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': getUserId() },
    body: JSON.stringify({ interview_id: interviewId })
  });

  return handleResponse(response);
}

export async function sendVoiceTurn({ interviewId, text, textModel, ttsModel, ttsProvider }) {
  const response = await fetch(`${getApiBase()}/voice/turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': getUserId() },
    body: JSON.stringify({
      interview_id: interviewId,
      text,
      text_model: textModel,
      tts_model: ttsModel,
      tts_provider: ttsProvider
    })
  });

  return handleResponse(response);
}

export async function sendVoiceIntro({ interviewId, textModel, ttsModel, ttsProvider }) {
  const response = await fetch(`${getApiBase()}/voice/intro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': getUserId() },
    body: JSON.stringify({
      interview_id: interviewId,
      text_model: textModel,
      tts_model: ttsModel,
      tts_provider: ttsProvider
    })
  });

  return handleResponse(response);
}

export async function sendVoiceFeedback({ interviewId, question, answer, textModel }) {
  const response = await fetch(`${getApiBase()}/voice/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': getUserId() },
    body: JSON.stringify({
      interview_id: interviewId,
      question,
      answer,
      text_model: textModel
    })
  });

  return handleResponse(response);
}

export async function sendVoiceHelp({ interviewId, question, answer, textModel, ttsModel, ttsProvider }) {
  const response = await fetch(`${getApiBase()}/voice/help`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': getUserId() },
    body: JSON.stringify({
      interview_id: interviewId,
      question,
      answer,
      text_model: textModel,
      tts_model: ttsModel,
      tts_provider: ttsProvider
    })
  });

  return handleResponse(response);
}

export async function sendVoiceTurnCompletion({ interviewId, question, answer, textModel }) {
  const response = await fetch(`${getApiBase()}/voice/turn/completion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': getUserId() },
    body: JSON.stringify({
      interview_id: interviewId,
      question,
      answer,
      text_model: textModel
    })
  });

  return handleResponse(response);
}

export async function scoreInterview({ interviewId, transcript }) {
  const response = await fetch(`${getApiBase()}/interviews/${interviewId}/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': getUserId() },
    body: JSON.stringify({ transcript })
  });

  return handleResponse(response);
}


export async function updateSessionName({ interviewId, name }) {
  const response = await fetch(`${getApiBase()}/interviews/${interviewId}/name`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': getUserId() },
    body: JSON.stringify({ name })
  });

  return handleResponse(response);
}

export async function addCustomQuestion({ interviewId, question, position }) {
  const response = await fetch(`${getApiBase()}/interviews/${interviewId}/questions/custom`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': getUserId() },
    body: JSON.stringify({ question, position })
  });

  return handleResponse(response);
}

export async function updateQuestionStatus({ interviewId, index, status, source }) {
  const response = await fetch(`${getApiBase()}/interviews/${interviewId}/questions/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': getUserId() },
    body: JSON.stringify({ index, status, source })
  });

  return handleResponse(response);
}

export async function restartInterview({ interviewId }) {
  const response = await fetch(`${getApiBase()}/interviews/${interviewId}/restart`, {
    method: 'POST',
    headers: { 'X-User-Id': getUserId() }
  });

  return handleResponse(response);
}

export async function listSessions() {
  const response = await fetch(`${getApiBase()}/interviews`, {
    headers: { 'X-User-Id': getUserId() }
  });

  return handleResponse(response);
}

export async function getInterviewSummary({ interviewId }) {
  const response = await fetch(`${getApiBase()}/interviews/${interviewId}`, {
    headers: { 'X-User-Id': getUserId() }
  });

  return handleResponse(response);
}

export async function logClientEvent({
  event,
  interviewId,
  sessionId,
  state,
  detail,
  category,
  step,
  value,
  properties,
  anonymousId,
  newUser
} = {}) {
  if (!event) {
    throw new Error('event is required');
  }
  if (!canSendTelemetry()) {
    return { status: 'skipped', reason: 'consent_not_granted' };
  }
  const normalizedProperties = sanitizeProperties(properties);
  const response = await fetch(`${getApiBase()}/telemetry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': getUserId() },
    body: JSON.stringify({
      event,
      interview_id: interviewId,
      session_id: sessionId,
      state,
      detail,
      category,
      step,
      value,
      properties: normalizedProperties,
      anonymous_id: anonymousId,
      new_user: typeof newUser === 'boolean' ? newUser : undefined
    })
  });

  return handleResponse(response);
}

export async function logJourneyEvent({
  event,
  interviewId,
  sessionId,
  state,
  detail,
  step,
  value,
  properties
} = {}) {
  const identity = getTelemetryIdentity();
  return logClientEvent({
    event,
    interviewId,
    sessionId,
    state,
    detail,
    category: 'journey',
    step: step || event,
    value,
    properties,
    anonymousId: identity.anonymousId,
    newUser: identity.newUser
  });
}

export async function getLogSummary() {
  const response = await fetch(`${getApiBase()}/logs/summary`, {
    headers: { 'X-User-Id': getUserId() }
  });

  return handleResponse(response);
}

export async function downloadStudyGuide({ interviewId, format = 'pdf' }) {
  const params = new URLSearchParams();
  if (format) {
    params.set('format', format);
  }
  const query = params.toString();
  const response = await fetch(`${getApiBase()}/interviews/${interviewId}/study-guide${query ? `?${query}` : ''}`, {
    headers: { 'X-User-Id': getUserId() }
  });

  if (!response.ok) {
    await handleResponse(response);
  }

  return response.blob();
}
