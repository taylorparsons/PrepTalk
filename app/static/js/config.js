function parseBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
  }
  return false;
}

export function getAppConfig() {
  if (typeof window === 'undefined') {
    return {
      apiBase: '/api',
      adapter: 'mock',
      liveModel: '',
      textModel: '',
      ttsModel: '',
      uiDevMode: false,
      voiceMode: 'turn',
      voiceOutputMode: 'auto',
      voiceTtsLanguage: 'en-US',
      voiceTurnEndDelayMs: 10000,
      voiceTurnCompletionConfidence: 0.9,
      voiceTurnCompletionCooldownMs: 0,
      userId: 'local'
    };
  }

  const storageKey = 'preptalk_user_id';

  function getStoredUserId() {
    if (!window?.localStorage) {
      return '';
    }
    try {
      return window.localStorage.getItem(storageKey) || '';
    } catch (error) {
      return '';
    }
  }

  function setStoredUserId(value) {
    if (!window?.localStorage) {
      return;
    }
    try {
      window.localStorage.setItem(storageKey, value);
    } catch (error) {
      // Ignore storage errors (private mode, blocked storage, etc.).
    }
  }

  function generateAnonymousUserId() {
    if (window?.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }
    return `anon-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  const config = window.__APP_CONFIG__ || {};
  const providedUserId = (config.userId || '').trim();
  const storedUserId = getStoredUserId();
  const effectiveUserId =
    providedUserId && providedUserId !== 'local'
      ? providedUserId
      : storedUserId || generateAnonymousUserId();

  if (!storedUserId && effectiveUserId && effectiveUserId !== 'local') {
    setStoredUserId(effectiveUserId);
  }

  return {
    apiBase: config.apiBase || '/api',
    adapter: config.adapter || 'mock',
    liveModel: config.liveModel || '',
    textModel: config.textModel || '',
    ttsModel: config.ttsModel || '',
    uiDevMode: false,
    voiceMode: 'turn',
    voiceOutputMode: config.voiceOutputMode || 'auto',
    voiceTtsLanguage: config.voiceTtsLanguage || 'en-US',
    voiceTurnEndDelayMs: Number.isFinite(config.voiceTurnEndDelayMs) ? config.voiceTurnEndDelayMs : 10000,
    voiceTurnCompletionConfidence: Number.isFinite(config.voiceTurnCompletionConfidence)
      ? config.voiceTurnCompletionConfidence
      : 0.9,
    voiceTurnCompletionCooldownMs: Number.isFinite(config.voiceTurnCompletionCooldownMs)
      ? config.voiceTurnCompletionCooldownMs
      : 0,
    userId: effectiveUserId || 'local'
  };
}
