export function getAppConfig() {
  if (typeof window === 'undefined') {
    return { apiBase: '/api', adapter: 'mock', liveModel: '', textModel: '' };
  }

  const config = window.__APP_CONFIG__ || {};
  return {
    apiBase: config.apiBase || '/api',
    adapter: config.adapter || 'mock',
    liveModel: config.liveModel || '',
    textModel: config.textModel || ''
  };
}
