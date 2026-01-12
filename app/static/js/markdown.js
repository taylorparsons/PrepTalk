import { marked } from './vendor/marked.esm.js';
import DOMPurify from './vendor/purify.es.js';

marked.use({ gfm: true, breaks: true });

export function renderMarkdown(text) {
  const source = typeof text === 'string' ? text : String(text ?? '');
  const html = marked.parse(source || '');
  return DOMPurify.sanitize(html);
}

export function renderMarkdownInto(element, text) {
  if (!element) return;
  element.innerHTML = renderMarkdown(text);
}
