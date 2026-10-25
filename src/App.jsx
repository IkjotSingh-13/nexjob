import { Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { BoardProvider } from './context/BoardContext.jsx';
import Layout from './components/Layout.jsx';
import RequireAuth from './components/RequireAuth.jsx';
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
 * Links from the multi-page build (jobs.html?q=react, job.html?id=3) keep
 * working: the file name picks the route, and the query string carries over.
 * The two pages that used `?id=` now carry it in the path instead.
 */
const LEGACY = {
  'index.html': '/',
  'jobs.html': '/jobs',
  'companies.html': '/companies',
  'salaries.html': '/salaries',
  'prep.html': '/prep',
  'dashboard.html': '/dashboard',
  'profile.html': '/profile',
  'post-job.html': '/post-job',
  'employer.html': '/employer',
  'auth.html': '/auth'
};

function LegacyRedirect() {
  const { pathname, search, hash } = useLocation();
  const [params] = useSearchParams();
  const file = pathname.split('/').pop();

  if (file === 'job.html' && params.get('id')) return <Navigate to={`/jobs/${params.get('id')}${hash}`} replace />;
  if (file === 'company.html' && params.get('id')) return <Navigate to={`/companies/${params.get('id')}${hash}`} replace />;
  if (LEGACY[file]) return <Navigate to={`${LEGACY[file]}${search}${hash}`} replace />;

  return <NotFound />;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BoardProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="jobs" element={<Jobs />} />
                <Route path="jobs/:id" element={<Job />} />
                <Route path="companies" element={<Companies />} />
                <Route path="companies/:id" element={<Company />} />
                <Route path="salaries" element={<Salaries />} />
                <Route path="prep" element={<Prep />} />

                <Route path="dashboard" element={
                  <RequireAuth role="seeker" employerTo="/employer"><Dashboard /></RequireAuth>
                } />
                <Route path="profile" element={
                  <RequireAuth role="seeker" employerTo="/employer"><Profile /></RequireAuth>
                } />
                <Route path="post-job" element={<RequireAuth role="employer"><PostJob /></RequireAuth>} />
                <Route path="employer" element={<RequireAuth role="employer"><Employer /></RequireAuth>} />

                <Route path="auth" element={<Auth />} />
                <Route path="*" element={<LegacyRedirect />} />
              </Route>
            </Routes>
          </BoardProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
