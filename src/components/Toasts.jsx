/**
 * Shows the messages sent with toast() from lib/toast.js.
 * Each one fades in, stays about three seconds, then fades out.
 */

import { useEffect, useState } from 'react';

export default function Toasts() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const add = (event) => setToasts((list) => [...list, { id: Math.random(), ...event.detail }]);
    window.addEventListener('nexjob:toast', add);
    return () => window.removeEventListener('nexjob:toast', add);
  }, []);

  const remove = (id) => setToasts((list) => list.filter((t) => t.id !== id));

  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => <Toast key={t.id} message={t.message} tone={t.tone} onDone={() => remove(t.id)} />)}
    </div>
  );
}

function Toast({ message, tone, onDone }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const fadeIn = requestAnimationFrame(() => setShown(true));
    const fadeOut = setTimeout(() => setShown(false), 3200);
    const gone = setTimeout(onDone, 3460);
    return () => {
      cancelAnimationFrame(fadeIn);
      clearTimeout(fadeOut);
      clearTimeout(gone);
    };
  }, []);

  return <div className={shown ? `toast toast--${tone} is-in` : `toast toast--${tone}`}>{message}</div>;
}
