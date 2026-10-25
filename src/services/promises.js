/**
 * Promise utilities.
 *
 * Small, composable building blocks the service layer is made from. None of
 * them knows what a job is.
 */

/**
 * How long each kind of operation takes, in milliseconds. There is no server,
 * so the service layer simulates the round trip: it keeps the UI honest about
 * pending states, and it is the seam a real backend would slot into.
 *
 * Set VITE_API_LATENCY_SCALE=0 to switch the waiting off entirely.
 */
export const LATENCY = {
  quick:  120,   /* a toggle, a bookmark, a stage change */
  normal: 350,   /* a form submission */
  auth:   500    /* signing in or registering */
};

const SCALE = Number(import.meta.env.VITE_API_LATENCY_SCALE ?? 1);

/** Resolve after `ms`. */
export const delay = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * Run `work` once the simulated round trip has elapsed. Whatever it returns
 * resolves the promise; anything it throws rejects it, exactly as a failed
 * request would.
 *
 * @template T
 * @param {() => T} work
 * @param {number} ms
 * @returns {Promise<T>}
 */
export const simulate = (work, ms = LATENCY.quick) => new Promise((resolve, reject) => {
  setTimeout(() => {
    try {
      resolve(work());
    } catch (error) {
      reject(error);
    }
  }, ms * SCALE);
});

/**
 * Reject if `promise` has not settled within `ms`. The loser of the race is
 * not cancelled — a promise cannot be — but nobody is waiting on it any more.
 */
export const withTimeout = (promise, ms, message = 'That took too long.') => {
  let timer;

  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

/**
 * Try `task` again when it rejects, waiting longer each time.
 *
 * @template T
 * @param {() => Promise<T>} task   called afresh for every attempt
 * @param {{attempts?: number, wait?: number}} options
 * @returns {Promise<T>}
 */
export const retry = (task, { attempts = 3, wait = 300 } = {}) =>
  task().catch((error) => {
    if (attempts <= 1) throw error;
    return delay(wait).then(() => retry(task, { attempts: attempts - 1, wait: wait * 2 }));
  });
