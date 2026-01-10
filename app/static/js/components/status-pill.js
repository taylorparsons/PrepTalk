const PILL_TONES = ['neutral', 'success', 'warning', 'danger', 'info'];

export function createStatusPill(options = {}) {
  const {
    label = '',
    tone = 'neutral',
    icon = null,
    ariaLabel = null,
    attrs = {}
  } = options;

  const pill = document.createElement('span');
  const resolvedTone = PILL_TONES.includes(tone) ? tone : 'neutral';

  pill.className = `ui-pill ui-pill--${resolvedTone}`;

  if (ariaLabel) {
    pill.setAttribute('aria-label', ariaLabel);
  }

  Object.entries(attrs).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    pill.setAttribute(key, String(value));
  });

  if (icon) {
    const iconSpan = document.createElement('span');
    iconSpan.className = 'ui-pill__icon';
    iconSpan.setAttribute('aria-hidden', 'true');

    if (typeof Node !== 'undefined' && icon instanceof Node) {
      iconSpan.appendChild(icon);
    } else {
      iconSpan.textContent = String(icon);
    }

    pill.appendChild(iconSpan);
  }

  const textSpan = document.createElement('span');
  textSpan.className = 'ui-pill__label';
  textSpan.textContent = label;
  pill.appendChild(textSpan);

  return pill;
}
