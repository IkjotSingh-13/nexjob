/**
 * Job seeker dashboard.
 *
 * Four things a job hunt needs kept in one place: where each application
 * sits, what is worth applying to next, what you bookmarked, and what you
 * asked to be told about.
 *
 * Applications, saves, alerts and the profile are all read from the store, so
 * a change made anywhere — a save on a job card, a stage moved by an employer
 * in another tab — shows up here without this page doing anything about it.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBoard } from '../context/BoardContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { facets, filterJobs, recommend } from '../lib/jobs.js';
import { profileCompleteness } from '../lib/profile.js';
import { CLOSED_STAGE, stageLabel } from '../lib/stages.js';
import { money, relTime, plural } from '../lib/format.js';
import { link } from '../lib/url.js';
import * as api from '../services/api.js';
import { useAction } from '../hooks/useAction.js';
import { usePageMeta } from '../hooks/usePageMeta.js';
import {
  useAlerts, useApplicationsFor, useProfile, useRecentIds, useSavedIds
} from '../hooks/useStore.js';
import { JobCard, JobCardMini, Skeletons } from '../components/JobCard.jsx';
import { Pipeline, stageTone } from '../components/Pipeline.jsx';
import { PayScale } from '../components/PayScale.jsx';
import { LoadError } from '../components/LoadError.jsx';
import { Icon } from '../components/Icon.jsx';

/* ------------------------------------------------------- Applications */

function ApplicationRow({ application, job, domain, busy, onWithdraw }) {
  const tone = stageTone(application.stage);

  return (
    <article className="app-row">
      <div>
        <div className="row row--tight" style={{ marginBottom: 'var(--s2)' }}>
          <span className={`pill pill--${tone} pill--dot`}>{stageLabel(application.stage)}</span>
          <span className="tick">Applied {relTime(new Date(application.appliedAt))}</span>
        </div>

        <h3 style={{ fontSize: 'var(--t-md)' }}>
          {job
            ? <Link to={`/jobs/${job.id}`} style={{ color: 'var(--ink)', textDecoration: 'none' }}>{application.jobTitle}</Link>
            : application.jobTitle}
        </h3>
        <p className="tick" style={{ marginTop: 3 }}>{application.companyName}</p>

        {job && (
          <div style={{ marginTop: 'var(--s4)', maxWidth: 340 }}>
            <div className="row row--split" style={{ marginBottom: 5 }}>
              <span className="figure" style={{ fontSize: 'var(--t-xs)' }}>{money(job.salaryMin)} – {money(job.salaryMax)}</span>
              <span className="tick">{job.location}</span>
            </div>
            <PayScale min={job.salaryMin} max={job.salaryMax} domain={domain} />
          </div>
        )}
      </div>

      <div className="app-row-track">
        <Pipeline stage={application.stage} />
        <div className="row row--end">
          <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={onWithdraw}>
            <Icon name="trash" size={14} />Withdraw
          </button>
        </div>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------- Alerts */

function AlertCard({ alert, matches, busy, onToggle, onRemove }) {
  return (
    <div className="card" style={{ padding: 'var(--s4) var(--s5)' }}>
      <div className="row row--split">
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: 'var(--t-sm)' }}>
            {alert.discipline}{alert.location ? ` · ${alert.location}` : ''}
          </p>
          <p className="tick" style={{ marginTop: 3 }}>{alert.frequency} · {alert.email}</p>
        </div>

        <div className="row row--tight">
          <span className={`pill ${alert.active ? 'pill--ok' : ''} pill--dot`}>{alert.active ? 'On' : 'Paused'}</span>
          <button type="button" className="ibtn" disabled={busy} onClick={onToggle}
                  aria-label={`${alert.active ? 'Pause' : 'Resume'} this alert`}>
            <Icon name={alert.active ? 'bell' : 'check'} size={15} />
          </button>
          <button type="button" className="ibtn" disabled={busy} onClick={onRemove} aria-label="Delete this alert">
            <Icon name="trash" size={15} />
          </button>
        </div>
      </div>

      <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', marginTop: 'var(--s3)' }}>
        {matches === null ? '' : matches ? (
          <>
            {plural(matches, 'role')} on the board match this right now.{' '}
            <Link to={link('/jobs', {
              disciplines: alert.discipline === 'Any' ? '' : alert.discipline,
              where: alert.location || ''
            })}>See them</Link>.
          </>
        ) : 'Nothing matches this on the board right now.'}
      </p>
    </div>
  );
}

function AlertForm({ user, disciplines }) {
  const toast = useToast();
  const [create, creating] = useAction(api.createAlert);

  const [email, setEmail] = useState(user.email);
  const [discipline, setDiscipline] = useState('Any');
  const [location, setLocation] = useState('');
  const [frequency, setFrequency] = useState('Weekly');

  const onSubmit = (event) => {
    event.preventDefault();

    create({ email: email.trim(), discipline, location: location.trim(), frequency, userId: user.id })
      .then(() => {
        setLocation('');
        toast('Alert created', 'ok');
      })
      .catch((error) => toast(error.message, 'stop'));
  };

  return (
    <div className="card">
      <h2 id="alerts-title" style={{ fontSize: 'var(--t-lg)' }}>New alert</h2>
      <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', margin: 'var(--s3) 0 var(--s5)' }}>
        Saved in this browser. There is no mail server behind this project, so an alert
        shows you its current matches instead of sending anything.
      </p>

      <form className="stack" id="alert-form" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="alert-email">Email address</label>
          <input className="input" type="email" id="alert-email" required placeholder="you@example.com"
                 value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="alert-discipline">Discipline</label>
          <span className="select-wrap">
            <select className="select" id="alert-discipline" value={discipline}
                    onChange={(event) => setDiscipline(event.target.value)}>
              {['Any', ...disciplines].map((d) => <option key={d}>{d}</option>)}
            </select>
          </span>
        </div>

        <div className="field">
          <label htmlFor="alert-location">Location</label>
          <input className="input" type="text" id="alert-location" placeholder="Anywhere, or remote"
                 value={location} onChange={(event) => setLocation(event.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="alert-frequency">How often</label>
          <span className="select-wrap">
            <select className="select" id="alert-frequency" value={frequency}
                    onChange={(event) => setFrequency(event.target.value)}>
              <option>Daily</option>
              <option>Weekly</option>
              <option>Monthly</option>
            </select>
          </span>
        </div>

        <button className="btn btn--primary btn--block" type="submit" disabled={creating}>
          {creating ? 'Creating…' : 'Create alert'}
        </button>
      </form>
    </div>
  );
}

/* ----------------------------------------------------------------- Page */

export default function Dashboard() {
  usePageMeta('Your dashboard — Nexjob', 'Your application pipeline, saved roles, job alerts and recommended roles in one place.');

  const { user } = useAuth();
  const toast = useToast();
  const { status, error, reload, jobs, domain } = useBoard();

  const profile = useProfile(user.id);
  const applications = useApplicationsFor(user.id);
  const savedIds = useSavedIds();
  const recentIds = useRecentIds();
  const alerts = useAlerts();

  /* Which row is mid-request, so its buttons can be disabled. */
  const [busyApplication, setBusyApplication] = useState(null);
  const [busyAlert, setBusyAlert] = useState(null);

  const ready = status === 'ready';
  const completeness = profileCompleteness(profile);
  const firstName = user.name.split(' ')[0];

  /* ---------------------------------------------------------- Derived */

  const jobFor = (id) => jobs.find((j) => Number(j.id) === Number(id));

  const live = applications.filter((a) => a.stage !== CLOSED_STAGE.id).length;

  const stats = [
    ['Applications', applications.length, `${live} still moving`],
    ['Saved roles', savedIds.length, 'bookmarked'],
    ['Alerts', alerts.filter((a) => a.active).length, 'switched on'],
    ['Profile', `${completeness}%`, 'filled in']
  ];

  const applied = applications.map((a) => Number(a.jobId));
  const matches = ready && profile.skills.length
    ? recommend(jobs.filter((j) => !applied.includes(Number(j.id))), profile, 5)
    : [];

  const saved = savedIds.map(jobFor).filter(Boolean);
  const recent = recentIds.map(jobFor).filter(Boolean).slice(0, 6);

  const alertMatches = (alert) => filterJobs(jobs, {
    disciplines: alert.discipline === 'Any' ? [] : [alert.discipline],
    where: alert.location || ''
  }).length;

  /* ------------------------------------------------------------ Events */

  const withdraw = (id) => {
    setBusyApplication(id);

    api.withdrawApplication(id)
      .then(() => toast('Application withdrawn'))
      .catch((error) => toast(error.message, 'stop'))
      .finally(() => setBusyApplication(null));
  };

  const toggleAlert = (id) => {
    setBusyAlert(id);

    api.toggleAlert(id)
      .catch((error) => toast(error.message, 'stop'))
      .finally(() => setBusyAlert(null));
  };

  const removeAlert = (id) => {
    setBusyAlert(id);

    api.deleteAlert(id)
      .then(() => toast('Alert deleted'))
      .catch((error) => toast(error.message, 'stop'))
      .finally(() => setBusyAlert(null));
  };

  /* A load error appears once, where the board's data is first needed. */
  const failed = status === 'error' && <LoadError title="Your dashboard did not load" error={error} onRetry={reload} />;

  return (
    <>
      <section className="strip strip--tight">
        <div className="wrap">
          <div className="dash-head">
            <div>
              <p className="tick tick--flag">Your dashboard</p>
              <h1 id="dash-greeting" style={{ marginTop: 'var(--s3)' }}>Hello, {firstName}</h1>
              <p id="dash-sub" style={{ marginTop: 'var(--s2)', color: 'var(--ink-2)' }}>
                {profile.headline || `${profile.level} ${profile.discipline} · profile ${completeness}% complete`}
              </p>
            </div>

            <div className="row row--tight">
              <Link className="btn btn--outline btn--sm" to="/profile">Profile and CV</Link>
              <Link className="btn btn--primary btn--sm" to="/jobs">Browse roles</Link>
            </div>
          </div>

          <div className="stats" id="dash-stats">
            {stats.map(([label, figure, note]) => (
              <div key={label} className="stat">
                <span className="tick">{label}</span>
                <span className="stat-figure">{figure}</span>
                <span className="tick" style={{ textTransform: 'none', letterSpacing: 0 }}>{note}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="strip" id="applications" aria-labelledby="app-title">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h2 id="app-title">Your pipeline</h2>
              <p>Every application you have sent, and where it currently sits.</p>
            </div>
          </div>

          <div className="stack" id="app-list">
            {failed}
            {applications.length ? applications.map((application) => (
              <ApplicationRow
                key={application.id}
                application={application}
                job={jobFor(application.jobId)}
                domain={domain}
                busy={busyApplication === application.id}
                onWithdraw={() => withdraw(application.id)}
              />
            )) : (
              <div className="empty">
                <h3>Nothing in the pipeline yet</h3>
                <p>
                  Applications you send show up here on a track, so you can see which ones are
                  still moving and which have gone quiet.
                </p>
                <Link className="btn btn--primary" to="/jobs">Find something to apply for</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="strip strip--panel" id="recommended" aria-labelledby="rec-title">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h2 id="rec-title">Matched to your profile</h2>
              <p>Scored against your skills, discipline and level. The reasons are shown, not hidden.</p>
            </div>
            <Link className="btn btn--outline btn--sm" to="/profile">Tune your profile</Link>
          </div>

          <div className="stack-2" id="rec-list">
            {!profile.skills.length ? (
              <div className="empty">
                <h3>Tell us what you do</h3>
                <p>
                  Add your skills, discipline and level, and this section scores every open role
                  against them — showing why each one matched.
                </p>
                <Link className="btn btn--primary" to="/profile">Fill in your profile</Link>
              </div>
            ) : !ready ? (
              status === 'loading' ? <Skeletons count={3} /> : null
            ) : matches.length ? matches.map(({ job, score, reasons }) => (
              <Link key={job.id} className="rec-row" to={`/jobs/${job.id}`}>
                <span className="rec-score">
                  <span className="rec-score-figure">{score}</span>
                  <span className="tick" style={{ display: 'block', marginTop: 2 }}>match</span>
                </span>

                <span className="mark mark--sm" aria-hidden="true"
                      style={{ background: job.company.brandBg, color: job.company.brandFg }}>
                  {job.company.initial}
                </span>

                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', fontWeight: 600, fontSize: 'var(--t-sm)' }}>{job.title}</span>
                  <span className="tick" style={{ display: 'block', marginTop: 3 }}>
                    {job.companyName} · {money(job.salaryMin)}–{money(job.salaryMax)} · {reasons.join(', ')}
                  </span>
                </span>

                <span className="tick tick--blue not-narrow">View</span>
              </Link>
            )) : (
              <div className="empty">
                <h3>Nothing scored above zero</h3>
                <p>
                  Your skills did not overlap with any open role. Try adding a few more, or widen
                  the discipline on your profile.
                </p>
                <Link className="btn btn--outline" to="/profile">Edit your profile</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="strip" id="saved" aria-labelledby="saved-title">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h2 id="saved-title">Saved roles</h2>
              <p id="saved-note">{saved.length ? `${plural(saved.length, 'role')} bookmarked.` : 'Nothing saved yet.'}</p>
            </div>
            <Link className="btn btn--outline btn--sm" to="/jobs?saved=1">Open in the board</Link>
          </div>

          <div className="stack" id="saved-list">
            {status === 'loading' && savedIds.length > 0 && <Skeletons count={2} />}
            {ready && (saved.length
              ? saved.map((job, i) => <JobCard key={job.id} job={job} index={i + 1} domain={domain} />)
              : (
                <div className="empty">
                  <h3>No saved roles</h3>
                  <p>
                    The bookmark on any listing keeps it here, so you can come back to a
                    shortlist rather than re-running the same search.
                  </p>
                  <Link className="btn btn--outline" to="/jobs">Browse the board</Link>
                </div>
              ))}
          </div>
        </div>
      </section>

      <section className="strip strip--panel" id="alerts" aria-labelledby="alerts-title">
        <div className="wrap split split--rail-wide">
          <AlertForm user={user} disciplines={facets(jobs).disciplines} />

          <div>
            <div className="sec-head">
              <div>
                <h2>Your alerts</h2>
                <p id="alert-count">{alerts.length ? `${plural(alerts.length, 'alert')} saved in this browser.` : 'None yet.'}</p>
              </div>
            </div>

            <div className="stack-2" id="alert-list">
              {alerts.length ? alerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  matches={ready ? alertMatches(alert) : null}
                  busy={busyAlert === alert.id}
                  onToggle={() => toggleAlert(alert.id)}
                  onRemove={() => removeAlert(alert.id)}
                />
              )) : (
                <div className="empty" style={{ padding: 'var(--s7) var(--s5)' }}>
                  <h3>No alerts yet</h3>
                  <p>An alert remembers a search so you do not have to run it again.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="strip" id="recent" aria-labelledby="recent-title">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h2 id="recent-title">Recently viewed</h2>
              <p>The last few roles you opened.</p>
            </div>
          </div>

          <div className="grid-cards" id="recent-list">
            {recent.length
              ? recent.map((job) => <JobCardMini key={job.id} job={job} />)
              : <p className="tick" style={{ gridColumn: '1/-1' }}>Nothing opened yet.</p>}
          </div>
        </div>
      </section>
    </>
  );
}
