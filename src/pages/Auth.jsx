/**
 * Sign in and create account.
 *
 * Two panels behind one tab strip. The `next` parameter carries whoever sent
 * the visitor here, so signing in returns them to the page they wanted rather
 * than dumping them on the home page.
 *
 * Both submissions are Promises from the service layer: the button shows its
 * pending label while the request is out, a rejection becomes the message in
 * the error box, and `finally` (inside useAction) always puts the button back.
 */

import { useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useBoard } from '../context/BoardContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { safeNext } from '../lib/url.js';
import { useAction } from '../hooks/useAction.js';
import { usePageMeta } from '../hooks/usePageMeta.js';

const NEED = {
  employer: 'That page is for employer accounts. Sign in with one, or create one below.',
  seeker: 'That page is for job seeker accounts. Sign in with one, or create one below.'
};

const landingFor = (user, next) => next ?? (user.role === 'employer' ? '/employer' : '/dashboard');

export default function Auth() {
  usePageMeta('Sign in — Nexjob', 'Sign in or create a Nexjob account as a job seeker or an employer.');

  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, signIn, register } = useAuth();
  const { companies } = useBoard();

  const [runSignIn, signingIn] = useAction(signIn);
  const [runRegister, registering] = useAction(register);

  const next = safeNext(params.get('next'));
  const need = params.get('need');

  const [tab, setTab] = useState(params.get('tab') === 'register' ? 'register' : 'signin');
  const [role, setRole] = useState(params.get('role') === 'employer' ? 'employer' : 'seeker');
  const [error, setError] = useState(NEED[need] ?? '');

  const [signinEmail, setSigninEmail] = useState('');
  const [signinPassword, setSigninPassword] = useState('');
  const passwordRef = useRef(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyPick, setCompanyPick] = useState('');
  const [companyName, setCompanyName] = useState('');

  /* Already signed in? Send them where they were going. A `need` means they
     were sent here because their account was the wrong kind, so stay. */
  if (user && !need) return <Navigate to={landingFor(user, next)} replace />;

  const isRegister = tab === 'register';
  const isEmployer = role === 'employer';

  const showTab = (which) => {
    setTab(which);
    setError('');
  };

  const arrive = (signedIn, message) => {
    toast(message, 'ok');
    navigate(landingFor(signedIn, next), { replace: true });
  };

  /* ---------------------------------------------------------- Submit */

  const onSignIn = (event) => {
    event.preventDefault();
    setError('');

    runSignIn(signinEmail, signinPassword)
      .then((signedIn) => arrive(signedIn, `Signed in as ${signedIn.name}`))
      .catch((failure) => setError(failure.message));
  };

  const onRegister = (event) => {
    event.preventDefault();
    setError('');

    const details = { name: name.trim(), email: email.trim(), password, role };

    if (isEmployer) {
      if (companyPick === '__new') {
        const typed = companyName.trim();
        if (!typed) return setError('Give your company a name, or pick one from the list.');
        details.companyName = typed;
      } else if (companyPick) {
        details.companyId = companyPick;
      } else {
        return setError('Choose the company you are hiring for.');
      }
    }

    return runRegister(details)
      .then((created) => arrive(created, 'Account created'))
      .catch((failure) => setError(failure.message));
  };

  const fill = (address) => {
    setSigninEmail(address);
    setSigninPassword('password123');
    passwordRef.current?.focus();
  };

  return (
    <div className="wrap auth-wrap">

      <div>
        <p className="tick tick--flag" style={{ marginBottom: 'var(--s4)' }}>Nexjob account</p>
        <h1 id="auth-heading">{isRegister ? 'Start tracking where you stand.' : 'Keep track of where you stand.'}</h1>

        <p style={{ marginTop: 'var(--s5)', color: 'var(--ink-2)', maxWidth: '46ch' }}>
          An account is what turns a job board into a pipeline. Everything below is stored
          in this browser only — there is no server behind this project.
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

        <p className="form-error" id="auth-error" role="alert" hidden={!error}>{error}</p>

        {/* Sign in */}
        <form className="stack" id="panel-signin" role="tabpanel" aria-labelledby="tab-signin"
              hidden={isRegister} onSubmit={onSignIn}>
          <div className="field">
            <label htmlFor="signin-email">Email address</label>
            <input className="input" type="email" id="signin-email" required placeholder="you@example.com"
                   autoComplete="email" value={signinEmail} onChange={(event) => setSigninEmail(event.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="signin-password">Password</label>
            <input className="input" type="password" id="signin-password" required autoComplete="current-password"
                   ref={passwordRef} value={signinPassword}
                   onChange={(event) => setSigninPassword(event.target.value)} />
          </div>

          <p className="demo-hint">
            Demo accounts — <strong>seeker:</strong> <code>jane@example.com</code> ·{' '}
            <strong>employer:</strong> <code>alex@example.com</code> · both use{' '}
            <code>password123</code>.{' '}
            <button type="button" id="fill-seeker" style={{ textDecoration: 'underline', color: 'var(--blue)' }}
                    onClick={() => fill('jane@example.com')}>Fill seeker</button>
            {' '}·{' '}
            <button type="button" id="fill-employer" style={{ textDecoration: 'underline', color: 'var(--blue)' }}
                    onClick={() => fill('alex@example.com')}>Fill employer</button>
          </p>

          <button className="btn btn--primary btn--block" type="submit" disabled={signingIn}>
            {signingIn ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Create account */}
        <form className="stack" id="panel-register" role="tabpanel" aria-labelledby="tab-register"
              hidden={!isRegister} onSubmit={onRegister}>
          <div className="field">
            <span className="field-label" id="role-label">I am here to</span>
            <div className="role-pick" role="group" aria-labelledby="role-label">
              <button type="button" className="role-option" aria-pressed={!isEmployer} onClick={() => setRole('seeker')}>
                <span className="role-option-name">Find a job</span>
                <span className="role-option-note">Apply and track</span>
              </button>
              <button type="button" className="role-option" aria-pressed={isEmployer} onClick={() => setRole('employer')}>
                <span className="role-option-name">Hire someone</span>
                <span className="role-option-note">Post and review</span>
              </button>
            </div>
          </div>

          <div className="field">
            <label htmlFor="register-name">Full name</label>
            <input className="input" type="text" id="register-name" required placeholder="Alex Rivera"
                   autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="register-email">Email address</label>
            <input className="input" type="email" id="register-email" required placeholder="you@example.com"
                   autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="register-password">Password</label>
            <input className="input" type="password" id="register-password" required minLength={6}
                   placeholder="At least 6 characters" autoComplete="new-password" value={password}
                   onChange={(event) => setPassword(event.target.value)} />
            <span className="field-note">Six characters or more.</span>
          </div>

          <div className="field" id="company-field" hidden={!isEmployer}>
            <label htmlFor="register-company">Your company</label>
            <span className="select-wrap">
              <select className="select" id="register-company" value={companyPick}
                      onChange={(event) => setCompanyPick(event.target.value)}>
                <option value="">Choose a company…</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="__new">Somewhere else — I will name it</option>
              </select>
            </span>
          </div>

          <div className="field" id="company-name-field" hidden={!isEmployer || companyPick !== '__new'}>
            <label htmlFor="register-company-name">Company name</label>
            <input className="input" type="text" id="register-company-name" placeholder="Acme"
                   value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
            <span className="field-note">We will create a profile you can fill in later.</span>
          </div>

          <button className="btn btn--primary btn--block" type="submit" disabled={registering}>
            {registering ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
