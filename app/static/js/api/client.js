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

  let detail = 'Request failed';
  try {
    const payload = await response.json();
    if (payload?.detail) {
      detail = payload.detail;
    }
  } catch (error) {
    // Ignore parsing errors and fall back to status text.
  }

  throw new Error(detail || response.statusText);
}

export async function createInterview({ resumeFile, jobFile, roleTitle }) {
  const formData = new FormData();
  formData.append('resume', resumeFile);
  formData.append('job_description', jobFile);
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

export async function downloadStudyGuide({ interviewId }) {
  const response = await fetch(`${getApiBase()}/interviews/${interviewId}/study-guide`, {
    headers: { 'X-User-Id': getUserId() }
  });

  if (!response.ok) {
    await handleResponse(response);
  }

  return response.blob();
}
