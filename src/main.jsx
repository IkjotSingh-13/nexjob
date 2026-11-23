/**
 * The start of the app.
 *
 * One React app with React Router. Each address (#/jobs, #/job?id=3 ...)
 * shows one page component inside the shared layout (header, footer, menu).
 */

import { useContext } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router';

import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/pages.css';

import { migrate } from './lib/store.js';
import { UserContext, UserProvider } from './lib/UserContext.jsx';
import Layout from './components/Layout.jsx';
import Toasts from './components/Toasts.jsx';
import Home from './pages/Home.jsx';
import Jobs from './pages/Jobs.jsx';
import Job from './pages/Job.jsx';
import Companies from './pages/Companies.jsx';
import Company from './pages/Company.jsx';
import Salaries from './pages/Salaries.jsx';
import Prep from './pages/Prep.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import PostJob from './pages/PostJob.jsx';
import Employer from './pages/Employer.jsx';
import Auth from './pages/Auth.jsx';
import NotFound from './pages/NotFound.jsx';

/**
 * A page for one kind of account ('seeker' or 'employer'). Anyone else goes to
 * the sign-in page, which sends them back here afterwards (?next=).
 */
function RequireRole({ role, children }) {
  const { user } = useContext(UserContext);
  const location = useLocation();

  if (user && user.role === role) return children;

  const next = encodeURIComponent(location.pathname + location.search);
  const need = user ? `&need=${role}` : '';   // signed in, but as the other kind of account
  return <Navigate to={`/auth?next=${next}${need}`} replace />;
}

function App() {
  const location = useLocation();

  return (
    <>
      {/* A new key on every visit to a page draws it fresh, as if it had just been opened. */}
      <Layout key={location.key}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/job" element={<Job />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/company" element={<Company />} />
          <Route path="/salaries" element={<Salaries />} />
          <Route path="/prep" element={<Prep />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<RequireRole role="seeker"><Dashboard /></RequireRole>} />
          <Route path="/profile" element={<RequireRole role="seeker"><Profile /></RequireRole>} />
          <Route path="/post-job" element={<RequireRole role="employer"><PostJob /></RequireRole>} />
          <Route path="/employer" element={<RequireRole role="employer"><Employer /></RequireRole>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>

      {/* Outside the layout, so a message ("Signed in") stays up while the page changes. */}
      <Toasts />
    </>
  );
}

migrate();   // copy saves across from the very first version, once

/* useTransitions={false}: change the page straight away, together with setUser().
   Otherwise signing out on a protected page shows that page once with no user,
   and RequireRole sends you to sign in instead of home. */
createRoot(document.getElementById('root')).render(
  <UserProvider>
    <HashRouter useTransitions={false}>
      <App />
    </HashRouter>
  </UserProvider>
);
