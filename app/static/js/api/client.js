import { getAppConfig } from '../config.js';

function getApiBase() {
  const config = getAppConfig();
  return config.apiBase || '/api';
}

function getUserId() {
  const config = getAppConfig();
  return config.userId || 'local';
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

export async function logClientEvent({ event, interviewId, sessionId, state, detail } = {}) {
  if (!event) {
    throw new Error('event is required');
  }
  const response = await fetch(`${getApiBase()}/telemetry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': getUserId() },
    body: JSON.stringify({
      event,
      interview_id: interviewId,
      session_id: sessionId,
      state,
      detail
    })
  });

  return handleResponse(response);
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
