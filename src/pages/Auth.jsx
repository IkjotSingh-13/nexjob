/**
 * Sign in and create account.
 *
 * ?next=/job?id=3 sends the visitor back where they were going afterwards.
 * ?need=employer explains why they were sent here. ?tab=register&role=employer
 * opens the sign-up form for employers.
 */

import { useContext, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useBoardData } from '../lib/hooks.js';
import { signIn, register } from '../lib/auth.js';
import { UserContext } from '../lib/UserContext.jsx';
import { getParam } from '../lib/url.js';
import { toast } from '../lib/toast.js';

/** Where to go after signing in. */
const landing = (user) => {
  if (getParam('next')) return getParam('next');
  return user.role === 'employer' ? '/employer' : '/dashboard';
};

const NEED_MESSAGE = {
  employer: 'That page is for employer accounts. Sign in with one, or create one below.',
  seeker: 'That page is for job seeker accounts. Sign in with one, or create one below.'
};

export default function Auth() {
  const { user } = useContext(UserContext);

  /* Already signed in? Go straight on. */
  if (user && !getParam('need')) return <Navigate to={landing(user)} replace />;

  return <AuthForms />;
}

function AuthForms() {
  const { setUser } = useContext(UserContext);
  const navigate = useNavigate();
  const { data, failed } = useBoardData();   // only needed for the employer's company list

  const [tab, setTab] = useState(getParam('tab') === 'register' ? 'register' : 'signin');
  const [error, setError] = useState(NEED_MESSAGE[getParam('need')] || '');
  const [busy, setBusy] = useState(false);   // waiting for the (fake) server

  /* Sign in */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const passwordInput = useRef(null);

  /* Create account */
  const [role, setRole] = useState(getParam('role') === 'employer' ? 'employer' : 'seeker');
  const [picked, setPicked] = useState('');
  const companyId = failed ? '__new' : picked;   // no company list: they have to name their own

  const showTab = (which) => {
    setTab(which);
    setError('');
  };

  const fillDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
    passwordInput.current.focus();
  };

  const submitSignIn = (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);                                  // jawab aane tak button band

    signIn(email, password)
      .then((user) => {                             // Promise resolve hua: sign in ho gaya
        setUser(user);                              // context: header ab naya user dikhayega
        toast(`Signed in as ${user.name}`, 'ok');
        navigate(landing(user));
      })
      .catch((err) => setError(err.message))        // Promise reject hua: error dikhao
      .finally(() => setBusy(false));               // dono case mein: button wapas theek
  };

  const submitRegister = (event) => {
    event.preventDefault();
    setError('');

    const form = new FormData(event.target);
    const details = {
      name: form.get('name').trim(),
      email: form.get('email').trim(),
      password: form.get('password'),
      role
    };

    if (role === 'employer') {
      if (companyId === '__new') {
        const name = form.get('companyName').trim();
        if (!name) return setError('Give your company a name, or pick one from the list.');
        details.companyName = name;
      } else if (companyId) {
        details.companyId = companyId;
      } else {
        return setError('Choose the company you are hiring for.');
      }
    }

    setBusy(true);

    register(details)
      .then((user) => {
        setUser(user);
        toast('Account created', 'ok');
        navigate(landing(user));
      })
      .catch((err) => setError(err.message))
      .finally(() => setBusy(false));
  };

  const isRegister = tab === 'register';

  return (
    <div className="wrap auth-wrap">
      <div>
        <p className="tick tick--flag" style={{ marginBottom: 'var(--s4)' }}>Nexjob account</p>
        <h1>{isRegister ? 'Start tracking where you stand.' : 'Keep track of where you stand.'}</h1>

        <p style={{ marginTop: 'var(--s5)', color: 'var(--ink-2)', maxWidth: '46ch' }}>
          An account is what turns a job board into a pipeline. Everything below is stored
          in this browser only — the backend keeps just the jobs and companies.
        </p>

        <ul className="bullets" style={{ marginTop: 'var(--s6)', maxWidth: '44ch' }}>
          <li>Applications land on a track you can follow from applied through to offer</li>
          <li>Saved roles and alerts stay with you between visits</li>
          <li>Your profile scores new roles against your own skills, with the reasons shown</li>
          <li>Employers get a posting dashboard and an applicant pipeline</li>
        </ul>

        <div className="callout" style={{ marginTop: 'var(--s7)', maxWidth: '48ch' }}>
          <div>
            <strong>Coursework demo.</strong> Passwords are held in plain text in{' '}
            <code>localStorage</code> because there is nowhere else to put them. Do not reuse
            a password you use anywhere real.
          </div>
        </div>
      </div>

      <div className="card auth-card">
        <div className="tabs" role="tablist" style={{ marginBottom: 'var(--s5)' }}>
          <button type="button" className="tab" id="tab-signin" role="tab" aria-selected={!isRegister}
                  aria-controls="panel-signin" onClick={() => showTab('signin')}>Sign in</button>
          <button type="button" className="tab" id="tab-register" role="tab" aria-selected={isRegister}
                  aria-controls="panel-register" onClick={() => showTab('register')}>Create account</button>
        </div>

        <p className="form-error" role="alert" hidden={!error}>{error}</p>

        {/* Sign in */}
        <form className="stack" id="panel-signin" role="tabpanel" aria-labelledby="tab-signin" hidden={isRegister}
              onSubmit={submitSignIn}>
          <div className="field">
            <label htmlFor="signin-email">Email address</label>
            <input className="input" type="email" id="signin-email" required placeholder="you@example.com"
                   autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="signin-password">Password</label>
            <input className="input" type="password" id="signin-password" required autoComplete="current-password"
                   value={password} onChange={(e) => setPassword(e.target.value)} ref={passwordInput} />
          </div>

          <p className="demo-hint">
            Demo accounts — <strong>seeker:</strong> <code>jane@example.com</code> ·{' '}
            <strong>employer:</strong> <code>alex@example.com</code> · both use{' '}
            <code>password123</code>.{' '}
            <button type="button" style={{ textDecoration: 'underline', color: 'var(--blue)' }}
                    onClick={() => fillDemo('jane@example.com')}>Fill seeker</button>
            {' · '}
            <button type="button" style={{ textDecoration: 'underline', color: 'var(--blue)' }}
                    onClick={() => fillDemo('alex@example.com')}>Fill employer</button>
          </p>

          <button className="btn btn--primary btn--block" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Create account */}
        <form className="stack" id="panel-register" role="tabpanel" aria-labelledby="tab-register" hidden={!isRegister}
              onSubmit={submitRegister}>
          <div className="field">
            <span className="field-label" id="role-label">I am here to</span>
            <div className="role-pick" role="group" aria-labelledby="role-label">
              <button type="button" className="role-option" aria-pressed={role === 'seeker'} onClick={() => setRole('seeker')}>
                <span className="role-option-name">Find a job</span>
                <span className="role-option-note">Apply and track</span>
              </button>
              <button type="button" className="role-option" aria-pressed={role === 'employer'} onClick={() => setRole('employer')}>
                <span className="role-option-name">Hire someone</span>
                <span className="role-option-note">Post and review</span>
              </button>
            </div>
          </div>

          <div className="field">
            <label htmlFor="register-name">Full name</label>
            <input className="input" type="text" id="register-name" name="name" required placeholder="Alex Rivera"
                   autoComplete="name" />
          </div>

          <div className="field">
            <label htmlFor="register-email">Email address</label>
            <input className="input" type="email" id="register-email" name="email" required placeholder="you@example.com"
                   autoComplete="email" />
          </div>

          <div className="field">
            <label htmlFor="register-password">Password</label>
            <input className="input" type="password" id="register-password" name="password" required minLength="6"
                   placeholder="At least 6 characters" autoComplete="new-password" />
            <span className="field-note">Six characters or more.</span>
          </div>

          <div className="field" hidden={role !== 'employer'}>
            <label htmlFor="register-company">Your company</label>
            <span className="select-wrap">
              <select className="select" id="register-company" value={companyId} onChange={(e) => setPicked(e.target.value)}>
                {failed ? (
                  <option value="__new">Name your company</option>
                ) : (
                  <>
                    <option value="">Choose a company…</option>
                    {data && data.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    <option value="__new">Somewhere else — I will name it</option>
                  </>
                )}
              </select>
            </span>
          </div>

          <div className="field" hidden={role !== 'employer' || companyId !== '__new'}>
            <label htmlFor="register-company-name">Company name</label>
            <input className="input" type="text" id="register-company-name" name="companyName" placeholder="Acme" />
            <span className="field-note">We will create a profile you can fill in later.</span>
          </div>

          <button className="btn btn--primary btn--block" type="submit" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
