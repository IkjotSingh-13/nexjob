import { createContext, useCallback, useContext, useEffect, useState } from 'react';

/**
 * Short-lived status messages.
 *
 * An action keeps its name through the whole flow: the button that says
 * "Save role" produces "Role saved".
 */

const ToastContext = createContext(() => {});

let nextId = 1;

function ToastItem({ toast, onDone }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    const hide = setTimeout(() => setShown(false), 3200);
    const remove = setTimeout(() => onDone(toast.id), 3200 + 260);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(hide);
      clearTimeout(remove);
    };
  }, [toast.id, onDone]);

  return <div className={`toast toast--${toast.tone}${shown ? ' is-in' : ''}`}>{toast.message}</div>;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((item) => item.id !== id));
  }, []);

  /** @param {string} message  @param {'info'|'ok'|'stop'} tone */
  const toast = useCallback((message, tone = 'info') => {
    setToasts((list) => [...list, { id: nextId++, message, tone }]);
  }, []);

  return (
    <ToastContext value={toast}>
      {children}
      <div className="toasts" id="toasts" aria-live="polite">
        {toasts.map((item) => <ToastItem key={item.id} toast={item} onDone={dismiss} />)}
      </div>
    </ToastContext>
  );
}

export const useToast = () => useContext(ToastContext);
