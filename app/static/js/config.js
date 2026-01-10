export function getAppConfig() {
  if (typeof window === 'undefined') {
    return { apiBase: '/api', adapter: 'mock', liveModel: '', textModel: '', userId: 'local' };
  }

  const config = window.__APP_CONFIG__ || {};
  return {
    apiBase: config.apiBase || '/api',
    adapter: config.adapter || 'mock',
    liveModel: config.liveModel || '',
    textModel: config.textModel || '',
    userId: config.userId || 'local'
  };
}
