import { createContext, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { KEY } from '../services/storage.js';
import * as api from '../services/api.js';
import { useDb } from '../hooks/useDb.js';

/**
 * Accounts and sessions.
 *
 * `user` is the stored session, read reactively, so signing in or out in one
 * tab updates every other. The three operations are the service layer's own
 * and return Promises; see services/api.js.
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const user = useDb(KEY.session, null);
  const navigate = useNavigate();

  const value = useMemo(() => ({
    user,
    signIn: api.signIn,
    register: api.register,

    /* Leave first, then drop the session. Doing it the other way round would
       strip the session from under a protected page and bounce the visitor to
       the sign-in form on their way out. */
    signOut: () => {
      navigate('/');
      return api.signOut();
    }
  }), [user, navigate]);

  return <AuthContext value={value}>{children}</AuthContext>;
}

export const useAuth = () => useContext(AuthContext);
