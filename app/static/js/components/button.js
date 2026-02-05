const BUTTON_VARIANTS = ['primary', 'secondary', 'ghost', 'danger'];
const BUTTON_SIZES = ['sm', 'md', 'lg'];

export function createButton(options = {}) {
  const {
    label = '',
    variant = 'primary',
    size = 'md',
    disabled = false,
    type = 'button',
    icon = null,
    iconPosition = 'left',
    onClick = null,
    ariaLabel = null,
    attrs = {}
  } = options;

  const button = document.createElement('button');
  const resolvedVariant = BUTTON_VARIANTS.includes(variant) ? variant : 'primary';
  const resolvedSize = BUTTON_SIZES.includes(size) ? size : 'md';

  button.type = type;
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
    'ui-button',
    `ui-button--${resolvedVariant}`,
    `ui-button--${resolvedSize}`,
    'btn',
    daisyVariant,
    daisySize
  ].join(' ');

  if (ariaLabel) {
    button.setAttribute('aria-label', ariaLabel);
  }

  Object.entries(attrs).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    button.setAttribute(key, String(value));
  });

  const labelSpan = document.createElement('span');
  labelSpan.className = 'ui-button__label';
  labelSpan.textContent = label;

  if (icon) {
    button.classList.add('ui-button--with-icon');
    const iconSpan = document.createElement('span');
    iconSpan.className = 'ui-button__icon';
    iconSpan.setAttribute('aria-hidden', 'true');

    if (typeof Node !== 'undefined' && icon instanceof Node) {
      iconSpan.appendChild(icon);
    } else {
      iconSpan.textContent = String(icon);
    }

    if (iconPosition === 'right') {
      button.appendChild(labelSpan);
      button.appendChild(iconSpan);
    } else {
      button.appendChild(iconSpan);
      button.appendChild(labelSpan);
    }
  } else {
    button.appendChild(labelSpan);
  }

  if (typeof onClick === 'function') {
    button.addEventListener('click', (event) => {
      if (button.disabled) return;
      onClick(event);
    });
  }

  return button;
}
