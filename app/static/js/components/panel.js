const PANEL_VARIANTS = ['surface', 'elevated', 'outline'];

export function createPanel(options = {}) {
  const {
    title = '',
    subtitle = '',
    content = null,
    footer = null,
    variant = 'surface',
    attrs = {}
  } = options;

  const panel = document.createElement('section');
  const resolvedVariant = PANEL_VARIANTS.includes(variant) ? variant : 'surface';

  panel.className = `ui-panel ui-panel--${resolvedVariant} card`;

  Object.entries(attrs).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    panel.setAttribute(key, String(value));
  });

  if (title || subtitle) {
    const header = document.createElement('header');
    header.className = 'ui-panel__header';

    if (title) {
      const heading = document.createElement('h2');
      heading.className = 'ui-panel__title card-title';
      heading.textContent = title;
      header.appendChild(heading);
    }

    if (subtitle) {
      const subtitleEl = document.createElement('p');
      subtitleEl.className = 'ui-panel__subtitle';
      subtitleEl.textContent = subtitle;
      header.appendChild(subtitleEl);
    }

    panel.appendChild(header);
  }

  const body = document.createElement('div');
  body.className = 'ui-panel__body card-body';

  if (Array.isArray(content)) {
    content.forEach((item) => {
      if (item === null || item === undefined) return;
      if (typeof Node !== 'undefined' && item instanceof Node) {
        body.appendChild(item);
      } else {
        body.appendChild(document.createTextNode(String(item)));
      }
    });
  } else if (content !== null && content !== undefined) {
    if (typeof Node !== 'undefined' && content instanceof Node) {
      body.appendChild(content);
    } else {
      body.appendChild(document.createTextNode(String(content)));
    }
  }

  panel.appendChild(body);

  if (footer !== null && footer !== undefined) {
    const footerEl = document.createElement('div');
    footerEl.className = 'ui-panel__footer';

    if (typeof Node !== 'undefined' && footer instanceof Node) {
      footerEl.appendChild(footer);
    } else {
      footerEl.appendChild(document.createTextNode(String(footer)));
    }

    panel.appendChild(footerEl);
  }

  return panel;
}
