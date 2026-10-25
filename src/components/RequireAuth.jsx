import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Send an unauthenticated visitor to the sign-in page, remembering where they
 * were headed.
 *
 * @param {{role?: 'seeker'|'employer', employerTo?: string, children: any}} props
 *   `role`        the account type the page is for
 *   `employerTo`  where to send an employer who lands on a seeker page, so they
 *                 reach their own dashboard rather than a sign-in wall
 */
export default function RequireAuth({ role, employerTo, children }) {
  const { user } = useAuth();
  const { pathname, search, hash } = useLocation();

  const next = encodeURIComponent(`${pathname}${search}${hash}`);

  if (user?.role === 'employer' && employerTo) return <Navigate to={employerTo} replace />;
  if (!user) return <Navigate to={`/auth?next=${next}`} replace />;
  if (role && user.role !== role) return <Navigate to={`/auth?next=${next}&need=${role}`} replace />;

  return children;
}
