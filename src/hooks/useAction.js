import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Wrap a Promise-returning operation with a `pending` flag.
 *
 *   const [signIn, signingIn] = useAction(api.signIn);
 *   signIn(email, password).then(...).catch(...);
 *
 * The returned promise is the operation's own — it resolves and rejects
 * exactly as the original does, so the caller decides what success and
 * failure mean. `pending` only tracks the wait, and is cleared in `finally`
 * so a rejection can never leave a button stuck disabled.
 */
export const useAction = (operation) => {
  const [pending, setPending] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const run = useCallback((...args) => {
    setPending(true);
    return operation(...args).finally(() => {
      if (mounted.current) setPending(false);
    });
  }, [operation]);

  return [run, pending];
};
