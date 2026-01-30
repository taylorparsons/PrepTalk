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

  const config = window.__APP_CONFIG__ || {};
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
    userId: config.userId || 'local'
  };
}
