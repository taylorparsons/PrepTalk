const ICON_VARIANTS = ['primary', 'secondary', 'ghost', 'danger'];
const ICON_SIZES = ['sm', 'md', 'lg'];

export function createIconButton(options = {}) {
  const {
    label = '',
    ariaLabel = null,
    icon = null,
    variant = 'primary',
    size = 'md',
    disabled = false,
    onClick = null,
    attrs = {}
  } = options;

  const button = document.createElement('button');
  const resolvedVariant = ICON_VARIANTS.includes(variant) ? variant : 'primary';
  const resolvedSize = ICON_SIZES.includes(size) ? size : 'md';

  button.type = 'button';
  button.disabled = Boolean(disabled);
  const daisyVariant = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-error'
  }[resolvedVariant];
  const daisySize = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg'
  }[resolvedSize];

  button.className = [
    'ui-icon-button',
    `ui-icon-button--${resolvedVariant}`,
    `ui-icon-button--${resolvedSize}`,
    'btn',
    daisyVariant,
    daisySize
  ].join(' ');
  button.setAttribute('aria-label', ariaLabel || label || 'Icon button');

  Object.entries(attrs).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    button.setAttribute(key, String(value));
  });

  const iconSpan = document.createElement('span');
  iconSpan.className = 'ui-icon-button__icon';
  iconSpan.setAttribute('aria-hidden', 'true');

  if (icon) {
    if (typeof Node !== 'undefined' && icon instanceof Node) {
      iconSpan.appendChild(icon);
    } else {
      iconSpan.textContent = String(icon);
    }
  }

  button.appendChild(iconSpan);

  if (label) {
    const srLabel = document.createElement('span');
    srLabel.className = 'sr-only';
    srLabel.textContent = label;
    button.appendChild(srLabel);
  }

  if (typeof onClick === 'function') {
    button.addEventListener('click', (event) => {
      if (button.disabled) return;
      onClick(event);
    });
  }

  return button;
}
