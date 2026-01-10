const ROLE_MAP = {
  coach: 'Coach',
  assistant: 'Coach',
  ai: 'Coach',
  candidate: 'You',
  user: 'You',
  system: 'System'
};

export function createTranscriptRow(options = {}) {
  const {
    role = 'system',
    text = '',
    timestamp = '',
    isFinal = false,
    attrs = {}
  } = options;

  const normalizedRole = String(role).toLowerCase();
  const roleKey = ROLE_MAP[normalizedRole] ? normalizedRole : 'system';

  const row = document.createElement('div');
  row.className = `ui-transcript__row ui-transcript__row--${roleKey}`;

  if (isFinal) {
    row.dataset.state = 'final';
  }

  Object.entries(attrs).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    row.setAttribute(key, String(value));
  });

  const meta = document.createElement('div');
  meta.className = 'ui-transcript__meta';

  const roleSpan = document.createElement('span');
  roleSpan.className = 'ui-transcript__role';
  roleSpan.textContent = ROLE_MAP[roleKey] || 'System';
  meta.appendChild(roleSpan);

  if (timestamp) {
    const timeSpan = document.createElement('span');
    timeSpan.className = 'ui-transcript__time';
    timeSpan.textContent = String(timestamp);
    meta.appendChild(timeSpan);
  }

  const body = document.createElement('p');
  body.className = 'ui-transcript__text';
  body.textContent = text;

  row.appendChild(meta);
  row.appendChild(body);

  return row;
}
