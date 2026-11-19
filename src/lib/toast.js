/**
 * Short status messages ("Role saved").
 *
 * Any code can call toast(). It sends a browser event, and the <Toasts />
 * component in the layout listens for it and shows the message.
 *
 * @param {string} message
 * @param {'info'|'ok'|'stop'} tone
 */
export const toast = (message, tone = 'info') => {
  window.dispatchEvent(new CustomEvent('nexjob:toast', { detail: { message, tone } }));
};
