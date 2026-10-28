/**
 * Short-lived status messages.
 *
 * An action keeps its name through the whole flow: the button that says
 * "Save role" produces "Role saved".
 */

import { esc } from './dom.js';

const host = () => {
  let node = document.getElementById('toasts');

  if (!node) {
    node = document.createElement('div');
    node.id = 'toasts';
    node.className = 'toasts';
    node.setAttribute('aria-live', 'polite');
    document.body.appendChild(node);
  }

  return node;
};

/**
 * @param {string} message
 * @param {'info'|'ok'|'stop'} tone
 */
export const toast = (message, tone = 'info') => {
  const node = document.createElement('div');
  node.className = `toast toast--${tone}`;
  node.innerHTML = esc(message);

  host().appendChild(node);
  requestAnimationFrame(() => node.classList.add('is-in'));

  setTimeout(() => {
    node.classList.remove('is-in');
    setTimeout(() => node.remove(), 260);
  }, 3200);
};
