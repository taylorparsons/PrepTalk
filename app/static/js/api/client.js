import { getAppConfig } from '../config.js';

function getApiBase() {
  const config = getAppConfig();
  return config.apiBase || '/api';
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
    body: formData
  });

  return handleResponse(response);
}

export async function startLiveSession({ interviewId }) {
  const response = await fetch(`${getApiBase()}/live/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ interview_id: interviewId })
  });

  return handleResponse(response);
}

export async function scoreInterview({ interviewId, transcript }) {
  const response = await fetch(`${getApiBase()}/interviews/${interviewId}/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript })
  });

  return handleResponse(response);
}
