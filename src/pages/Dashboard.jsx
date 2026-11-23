/**
 * The job seeker's dashboard: applications, matched roles, saved roles,
 * alerts and recently viewed roles.
 */

import { useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { useBoardData } from '../lib/hooks.js';
import { recommend, filterJobs, facets, jobById } from '../lib/data.js';
import { money, relTime, plural } from '../lib/format.js';
import { pageUrl } from '../lib/url.js';
import {
  applicationsFor, withdrawApplication, getSaved, toggleSaved, getRecent,
  getAlerts, addAlert, toggleAlert, removeAlert, getProfile, profileCompleteness, stageLabel, CLOSED_STAGE
} from '../lib/store.js';
import { UserContext } from '../lib/UserContext.jsx';
import { toast } from '../lib/toast.js';
import JobCard, { JobCardMini } from '../components/JobCard.jsx';
import { Pipeline, stageTone } from '../components/Pipeline.jsx';
import { PayScale } from '../components/PayScale.jsx';
import Stats from '../components/Stats.jsx';
import Mark from '../components/Mark.jsx';
import LoadError from '../components/LoadError.jsx';
import Icon from '../components/Icon.jsx';
import { Link } from 'react-router';

/* Only job seekers get here: main.jsx wraps this page in <RequireRole role="seeker">. */
export default function Dashboard() {
  const { user } = useContext(UserContext);
  return <SeekerDashboard user={user} />;
}

function SeekerDashboard({ user }) {
  const { hash } = useLocation();   // "#saved" in #/dashboard#saved
  const { data, failed } = useBoardData();
  const profile = getProfile(user.id);

  const [applications, setApplications] = useState(() => applicationsFor(user.id));
  const [saved, setSaved] = useState(getSaved);
  const [alerts, setAlerts] = useState(getAlerts);

  /* #/dashboard#saved: scroll there once the lists have filled in. */
  useEffect(() => {
    if (data && hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  }, [data]);

  const withdraw = (id) => {
    withdrawApplication(id);
    setApplications(applicationsFor(user.id));
    toast('Application withdrawn');
  };

  const toggleSave = (jobId) => {
    toggleSaved(jobId);
    setSaved(getSaved());
    toast('Saved roles updated');
  };

  const createAlert = (event) => {
    event.preventDefault();
    const form = event.target.elements;

    addAlert({
      email: form.email.value.trim(),
      discipline: form.discipline.value,
      location: form.location.value.trim(),
      frequency: form.frequency.value,
      userId: user.id
    });

    form.location.value = '';
    setAlerts(getAlerts());
    toast('Alert created', 'ok');
  };

  const pauseAlert = (id) => {
    toggleAlert(id);
    setAlerts(getAlerts());
  };

  const deleteAlert = (id) => {
    removeAlert(id);
    setAlerts(getAlerts());
    toast('Alert deleted');
  };

  const jobs = data ? data.jobs : [];
  const live = applications.filter((a) => a.stage !== CLOSED_STAGE.id).length;
  const savedJobs = saved.map((id) => jobById(jobs, id)).filter(Boolean);
  const recent = getRecent().map((id) => jobById(jobs, id)).filter(Boolean).slice(0, 6);

  /* Score every role not applied for yet. */
  const appliedIds = applications.map((a) => Number(a.jobId));
  const matches = recommend(jobs.filter((j) => !appliedIds.includes(Number(j.id))), profile, 5);

  /* How many roles on the board match an alert right now. */
  const alertMatches = (alert) => filterJobs(jobs, {
    disciplines: alert.discipline === 'Any' ? [] : [alert.discipline],
    where: alert.location || ''
  }).length;

  return (
    <>
      <section className="strip strip--tight">
        <div className="wrap">
          <div className="dash-head">
            <div>
              <p className="tick tick--flag">Your dashboard</p>
              <h1 style={{ marginTop: 'var(--s3)' }}>Hello, {user.name.split(' ')[0]}</h1>
              <p style={{ marginTop: 'var(--s2)', color: 'var(--ink-2)' }}>
                {profile.headline || `${profile.level} ${profile.discipline} · profile ${profileCompleteness(profile)}% complete`}
              </p>
            </div>

            <div className="row row--tight">
              <Link className="btn btn--outline btn--sm" to="/profile">Profile and CV</Link>
              <Link className="btn btn--primary btn--sm" to="/jobs">Browse roles</Link>
            </div>
          </div>

          <Stats items={[
            ['Applications', applications.length, `${live} still moving`],
            ['Saved roles', saved.length, 'bookmarked'],
            ['Alerts', alerts.filter((a) => a.active).length, 'switched on'],
            ['Profile', `${profileCompleteness(profile)}%`, 'filled in']
          ]} />
        </div>
      </section>

      {/* Applications */}
      <section className="strip" id="applications" aria-labelledby="app-title">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h2 id="app-title">Your pipeline</h2>
              <p>Every application you have sent, and where it currently sits.</p>
            </div>
          </div>

          <div className="stack">
            {failed && <LoadError title="Your dashboard did not load" />}
            {data && applications.map((application) => (
              <ApplicationRow key={application.id} application={application}
                              job={jobById(jobs, application.jobId)} domain={data.domain} onWithdraw={withdraw} />
            ))}
            {data && applications.length === 0 && (
              <div className="empty">
                <h3>Nothing in the pipeline yet</h3>
                <p>Applications you send show up here on a track, so you can see which ones are
                   still moving and which have gone quiet.</p>
                <Link className="btn btn--primary" to="/jobs">Find something to apply for</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Recommendations */}
      <section className="strip strip--panel" id="recommended" aria-labelledby="rec-title">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h2 id="rec-title">Matched to your profile</h2>
              <p>Scored against your skills, discipline and level. The reasons are shown, not hidden.</p>
            </div>
            <Link className="btn btn--outline btn--sm" to="/profile">Tune your profile</Link>
          </div>

          <div className="stack-2">
            {data && profile.skills.length === 0 && (
              <div className="empty">
                <h3>Tell us what you do</h3>
                <p>Add your skills, discipline and level, and this section scores every open role
                   against them — showing why each one matched.</p>
                <Link className="btn btn--primary" to="/profile">Fill in your profile</Link>
              </div>
            )}

            {data && profile.skills.length > 0 && matches.map(({ job, score, reasons }) => (
              <Link className="rec-row" to={`/job?id=${job.id}`} key={job.id}>
                <span className="rec-score">
                  <span className="rec-score-figure">{score}</span>
                  <span className="tick" style={{ display: 'block', marginTop: 2 }}>match</span>
                </span>

                <Mark company={job.company} size="sm" />

                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', fontWeight: 600, fontSize: 'var(--t-sm)' }}>{job.title}</span>
                  <span className="tick" style={{ display: 'block', marginTop: 3 }}>
                    {job.companyName} · {money(job.salaryMin)}–{money(job.salaryMax)} · {reasons.join(', ')}
                  </span>
                </span>

                <span className="tick tick--blue not-narrow">View</span>
              </Link>
            ))}

            {data && profile.skills.length > 0 && matches.length === 0 && (
              <div className="empty">
                <h3>Nothing scored above zero</h3>
                <p>Your skills did not overlap with any open role. Try adding a few more, or widen
                   the discipline on your profile.</p>
                <Link className="btn btn--outline" to="/profile">Edit your profile</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Saved */}
      <section className="strip" id="saved" aria-labelledby="saved-title">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h2 id="saved-title">Saved roles</h2>
              <p>
                {!data && 'Roles you bookmarked.'}
                {data && (savedJobs.length ? `${plural(savedJobs.length, 'role')} bookmarked.` : 'Nothing saved yet.')}
              </p>
            </div>
            <Link className="btn btn--outline btn--sm" to="/jobs?saved=1">Open in the board</Link>
          </div>

          <div className="stack">
            {savedJobs.map((job, i) => (
              <JobCard key={job.id} job={job} index={i + 1} domain={data.domain} saved onSave={toggleSave} />
            ))}
            {data && savedJobs.length === 0 && (
              <div className="empty">
                <h3>No saved roles</h3>
                <p>The bookmark on any listing keeps it here, so you can come back to a
                   shortlist rather than re-running the same search.</p>
                <Link className="btn btn--outline" to="/jobs">Browse the board</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Alerts */}
      <section className="strip strip--panel" id="alerts" aria-labelledby="alerts-title">
        <div className="wrap split split--rail-wide">

          <div className="card">
            <h2 id="alerts-title" style={{ fontSize: 'var(--t-lg)' }}>New alert</h2>
            <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', margin: 'var(--s3) 0 var(--s5)' }}>
              Saved in this browser. There is no mail server behind this project, so an alert
              shows you its current matches instead of sending anything.
            </p>

            <form className="stack" onSubmit={createAlert}>
              <div className="field">
                <label htmlFor="alert-email">Email address</label>
                <input className="input" type="email" id="alert-email" name="email" required
                       placeholder="you@example.com" defaultValue={user.email} />
              </div>

              <div className="field">
                <label htmlFor="alert-discipline">Discipline</label>
                <span className="select-wrap">
                  <select className="select" id="alert-discipline" name="discipline">
                    {data && ['Any', ...facets(jobs).disciplines].map((d) => <option key={d}>{d}</option>)}
                  </select>
                </span>
              </div>

              <div className="field">
                <label htmlFor="alert-location">Location</label>
                <input className="input" type="text" id="alert-location" name="location" placeholder="Anywhere, or remote" />
              </div>

              <div className="field">
                <label htmlFor="alert-frequency">How often</label>
                <span className="select-wrap">
                  <select className="select" id="alert-frequency" name="frequency" defaultValue="Weekly">
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                  </select>
                </span>
              </div>

              <button className="btn btn--primary btn--block" type="submit">Create alert</button>
            </form>
          </div>

          <div>
            <div className="sec-head">
              <div>
                <h2>Your alerts</h2>
                <p>{data && alerts.length ? `${plural(alerts.length, 'alert')} saved in this browser.` : 'None yet.'}</p>
              </div>
            </div>

            <div className="stack-2">
              {data && alerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} matches={alertMatches(alert)}
                           onToggle={pauseAlert} onDelete={deleteAlert} />
              ))}
              {data && alerts.length === 0 && (
                <div className="empty" style={{ padding: 'var(--s7) var(--s5)' }}>
                  <h3>No alerts yet</h3>
                  <p>An alert remembers a search so you do not have to run it again.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Recently viewed */}
      <section className="strip" id="recent" aria-labelledby="recent-title">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h2 id="recent-title">Recently viewed</h2>
              <p>The last few roles you opened.</p>
            </div>
          </div>

          <div className="grid-cards">
            {recent.map((job) => <JobCardMini job={job} key={job.id} />)}
            {data && recent.length === 0 && <p className="tick" style={{ gridColumn: '1/-1' }}>Nothing opened yet.</p>}
          </div>
        </div>
      </section>
    </>
  );
}

function ApplicationRow({ application, job, domain, onWithdraw }) {
  return (
    <article className="app-row">
      <div>
        <div className="row row--tight" style={{ marginBottom: 'var(--s2)' }}>
          <span className={`pill pill--${stageTone(application.stage)} pill--dot`}>{stageLabel(application.stage)}</span>
          <span className="tick">Applied {relTime(application.appliedAt)}</span>
        </div>

        <h3 style={{ fontSize: 'var(--t-md)' }}>
          {job
            ? <Link to={`/job?id=${job.id}`} style={{ color: 'var(--ink)', textDecoration: 'none' }}>{application.jobTitle}</Link>
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
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onWithdraw(application.id)}>
            <Icon name="trash" size={14} />Withdraw
          </button>
        </div>
      </div>
    </article>
  );
}

function AlertCard({ alert, matches, onToggle, onDelete }) {
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
          <button type="button" className="ibtn" aria-label={`${alert.active ? 'Pause' : 'Resume'} this alert`}
                  onClick={() => onToggle(alert.id)}>
            <Icon name={alert.active ? 'bell' : 'check'} size={15} />
          </button>
          <button type="button" className="ibtn" aria-label="Delete this alert" onClick={() => onDelete(alert.id)}>
            <Icon name="trash" size={15} />
          </button>
        </div>
      </div>

      <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', marginTop: 'var(--s3)' }}>
        {matches ? (
          <>
            {plural(matches, 'role')} on the board match this right now.{' '}
            <Link to={pageUrl('/jobs', {
              disciplines: alert.discipline === 'Any' ? '' : alert.discipline,
              where: alert.location
            })}>See them</Link>.
          </>
        ) : 'Nothing matches this on the board right now.'}
      </p>
    </div>
  );
}
