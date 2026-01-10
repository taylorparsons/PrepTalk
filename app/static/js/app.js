import { mountVoiceApp } from './ui.js';

function initApp() {
  const root = document.getElementById('app');
  if (root) {
    mountVoiceApp(root);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
