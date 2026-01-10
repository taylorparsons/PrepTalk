import {
  createButton,
  createPanel,
  createStatusPill,
  createTranscriptRow
} from './components/index.js';

function buildControlPanel() {
  const status = createStatusPill({ label: 'Idle', tone: 'neutral' });
  const startButton = createButton({ label: 'Start Interview', variant: 'primary', size: 'lg' });
  const stopButton = createButton({ label: 'Stop Session', variant: 'ghost', size: 'md', disabled: true });

  const content = document.createElement('div');
  content.className = 'layout-stack';
  content.appendChild(status);
  content.appendChild(startButton);
  content.appendChild(stopButton);

  return createPanel({
    title: 'Session Controls',
    subtitle: 'Voice-only mode',
    content
  });
}

function buildTranscriptPanel() {
  const transcriptList = document.createElement('div');
  transcriptList.className = 'layout-stack';

  transcriptList.appendChild(
    createTranscriptRow({
      role: 'coach',
      text: 'Welcome. Tell me about your background.',
      timestamp: '00:00'
    })
  );

  transcriptList.appendChild(
    createTranscriptRow({
      role: 'candidate',
      text: 'I build data-driven products for hiring teams.',
      timestamp: '00:08',
      isFinal: true
    })
  );

  return createPanel({
    title: 'Live Transcript',
    subtitle: 'Streaming once the session starts',
    content: transcriptList
  });
}

export function buildVoiceLayout() {
  const layout = document.createElement('main');
  layout.className = 'layout-split';
  layout.appendChild(buildControlPanel());
  layout.appendChild(buildTranscriptPanel());
  return layout;
}

export function mountVoiceApp(root) {
  if (!root) return;
  root.innerHTML = '';
  root.appendChild(buildVoiceLayout());
}
