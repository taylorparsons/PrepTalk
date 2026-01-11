# UI Components

This project uses lightweight DOM factory components for the voice-first UI. Each component returns a DOM node and accepts a simple options object. Styles live in `app/static/css/components.css`.

## Components

### Button
```js
import { createButton } from '../app/static/js/components/button.js';

const startButton = createButton({
  label: 'Start Interview',
  variant: 'primary',
  size: 'lg',
  icon: 'play',
  onClick: () => console.log('start')
});
```

### Icon Button
```js
import { createIconButton } from '../app/static/js/components/icon-button.js';

const muteButton = createIconButton({
  label: 'Mute',
  icon: 'mute',
  variant: 'ghost'
});
```

### Panel
```js
import { createPanel } from '../app/static/js/components/panel.js';

const panel = createPanel({
  title: 'Live Session',
  subtitle: 'Mic ready',
  content: 'Waiting for audio...'
});
```

### Status Pill
```js
import { createStatusPill } from '../app/static/js/components/status-pill.js';

const pill = createStatusPill({ label: 'Connected', tone: 'success' });
```

### Transcript Row
```js
import { createTranscriptRow } from '../app/static/js/components/transcript-row.js';

const row = createTranscriptRow({
  role: 'coach',
  text: 'Tell me about yourself.',
  timestamp: '10:04 AM'
});
```

## Layout Helpers
Use `.layout-split` for desktop two-column layouts and `.layout-stack` for stacked sections. The split layout collapses to one column below 900px.

## Tests
Run component tests with:
```bash
npm test
```

## Voice App Layout
The voice-first layout is built in `app/static/js/ui.js`. It renders the setup, controls, questions, transcript, and score panels. The resume and job description inputs accept PDF, DOCX, or TXT and are tagged with `data-testid` attributes for Playwright E2E tests.
