/**
 * The one script every page loads.
 *
 * Each .html file says which page it is with <body data-page="...">, and this
 * file draws that page inside the shared layout (header, footer, menu).
 */

import { createRoot } from 'react-dom/client';

import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/pages.css';

import { migrate } from './lib/store.js';
import Layout from './components/Layout.jsx';
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

const PAGES = {
  home: Home,
  jobs: Jobs,
  job: Job,
  companies: Companies,
  company: Company,
  salaries: Salaries,
  prep: Prep,
  dashboard: Dashboard,
  profile: Profile,
  'post-job': PostJob,
  employer: Employer,
  auth: Auth,
  404: NotFound
};

migrate();   // copy saves across from the very first version, once

const page = document.body.dataset.page;
const Page = PAGES[page] || NotFound;

createRoot(document.getElementById('root')).render(
  <Layout page={page}>
    <Page />
  </Layout>
);
