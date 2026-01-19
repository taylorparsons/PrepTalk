export function getAppConfig() {
  if (typeof window === 'undefined') {
    return {
      apiBase: '/api',
      adapter: 'mock',
      liveModel: '',
      textModel: '',
      ttsModel: '',
      voiceMode: 'live',
      voiceOutputMode: 'auto',
      voiceTtsLanguage: 'en-US',
      voiceTurnEndDelayMs: 1500,
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
    voiceMode: config.voiceMode || 'live',
    voiceOutputMode: config.voiceOutputMode || 'auto',
    voiceTtsLanguage: config.voiceTtsLanguage || 'en-US',
    voiceTurnEndDelayMs: Number.isFinite(config.voiceTurnEndDelayMs) ? config.voiceTurnEndDelayMs : 1500,
    userId: config.userId || 'local'
  };
}
