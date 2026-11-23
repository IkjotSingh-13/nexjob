/**
 * Who is signed in, shared with every component through React context.
 *
 * Read it anywhere below <UserProvider> (see main.jsx):
 *   const { user, setUser } = useContext(UserContext);
 *
 * `user` is null when nobody is signed in. The session is also kept in
 * localStorage (lib/store.js), so it is still there after a reload.
 */

import { createContext, useState } from 'react';
import { getSession } from './store.js';

export const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(getSession);   // read once from localStorage

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}
