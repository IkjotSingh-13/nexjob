/**
 * A single role.
 *
 * The pay band gets the full treatment here: a tall scale, a labelled axis,
 * and the role's midpoint measured against the midpoint of the whole board.
 * That comparison is the reason to have a shared domain at all.
 */

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useBoard } from '../context/BoardContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { jobById, jobsAtCompany, prepFor } from '../lib/jobs.js';
import { relTime, dateShort, median } from '../lib/format.js';
import { stageIndex, stageLabel } from '../lib/stages.js';
import { link } from '../lib/url.js';
import * as api from '../services/api.js';
import { useAction } from '../hooks/useAction.js';
import { usePageMeta } from '../hooks/usePageMeta.js';
import { useSaved } from '../hooks/useSaved.js';
import { useApplicationsFor, useProfile } from '../hooks/useStore.js';
import { PayScaleFull } from '../components/PayScale.jsx';
import { JobCardMini } from '../components/JobCard.jsx';
import { BookmarkIcon, Icon } from '../components/Icon.jsx';
import { Pipeline } from '../components/Pipeline.jsx';
import { LoadError } from '../components/LoadError.jsx';

const DESCRIPTION = 'Full details for an open role, with its pay band drawn against the whole board and an application form.';

/* ------------------------------------------------------------- Apply */

function ApplyForm({ job, user }) {
  const toast = useToast();
  const profile = useProfile(user.id);
  const [apply, sending] = useAction(api.applyToJob);

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [portfolio, setPortfolio] = useState(profile.links.github || profile.links.website || '');
  const [note, setNote] = useState('');

  const onSubmit = (event) => {
    event.preventDefault();

    apply({
      jobId: job.id,
      userId: user.id,
      jobTitle: job.title,
      companyId: job.companyId,
      companyName: job.companyName,
      name: name.trim(),
      email: email.trim(),
      link: portfolio.trim(),
      note: note.trim()
    })
      /* Success needs no further work here: the application is now in the
         store, the panel above re-reads it, and this form unmounts. */
      .then(() => toast('Application sent', 'ok'))
      .catch((error) => toast(error.message, error.code === 'duplicate' ? 'info' : 'stop'));
  };

  return (
    <div className="card" id="apply-card">
      <h2 style={{ fontSize: 'var(--t-lg)' }}>Apply for this role</h2>
      <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', margin: 'var(--s3) 0 var(--s5)' }}>
        Applying adds this role to your pipeline so you can follow it from here.
      </p>

      <form className="stack" id="apply-form" onSubmit={onSubmit}>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="apply-name">Full name</label>
            <input className="input" type="text" id="apply-name" required autoComplete="name"
                   value={name} onChange={(event) => setName(event.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="apply-email">Email address</label>
            <input className="input" type="email" id="apply-email" required autoComplete="email"
                   value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="apply-link">Portfolio, CV or GitHub</label>
          <input className="input" type="url" id="apply-link" placeholder="https://"
                 value={portfolio} onChange={(event) => setPortfolio(event.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="apply-note">Why this role</label>
          <textarea className="textarea" id="apply-note" rows={4}
                    placeholder="A few lines on why you want it and what you would bring."
                    value={note} onChange={(event) => setNote(event.target.value)} />
          <span className="field-note">Optional, but the ones that get read are the ones that answer this.</span>
        </div>

        <div className="row row--end">
          <button type="submit" className="btn btn--primary" disabled={sending}>
            {sending ? 'Sending…' : 'Send application'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ApplyPanel({ job }) {
  const { user } = useAuth();
  const applications = useApplicationsFor(user?.id);

  if (!user) {
    return (
      <div className="card">
        <h2 style={{ fontSize: 'var(--t-lg)' }}>Apply for this role</h2>
        <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', margin: 'var(--s3) 0 var(--s5)' }}>
          Sign in first so your application lands on your pipeline and you can follow
          what happens to it.
        </p>
        <Link className="btn btn--primary" to={`/auth?next=${encodeURIComponent(`/jobs/${job.id}`)}`}>
          Sign in to apply
        </Link>
      </div>
    );
  }

  const existing = applications.find((a) => Number(a.jobId) === Number(job.id));

  if (!existing) return <ApplyForm job={job} user={user} />;

  return (
    <div className="card">
      <div className="row row--split" style={{ marginBottom: 'var(--s5)' }}>
        <h2 style={{ fontSize: 'var(--t-lg)' }}>Your application</h2>
        <span className={`pill ${existing.stage === 'closed' ? 'pill--stop' : 'pill--flag'} pill--dot`}>
          {stageLabel(existing.stage)}
        </span>
      </div>

      <Pipeline stage={existing.stage} />

      <p className="tick" style={{ marginTop: 'var(--s5)', textTransform: 'none', letterSpacing: 0, color: 'var(--ink-2)' }}>
        Sent {relTime(new Date(existing.appliedAt))} · {dateShort(existing.appliedAt)}
        {stageIndex(existing.stage) > 0 && ` · moved to ${stageLabel(existing.stage).toLowerCase()} since`}
      </p>

      <div className="row" style={{ marginTop: 'var(--s5)' }}>
        <Link className="btn btn--outline btn--sm" to="/dashboard#applications">Open your pipeline</Link>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- Page */

function Frame({ main, rail }) {
  return (
    <>
      <div className="wrap" style={{ paddingTop: 'var(--s5)' }}>
        <Link className="tick" to="/jobs" style={{ textDecoration: 'none' }}>&larr; All roles</Link>
      </div>

      <section className="strip strip--tight" style={{ paddingTop: 'var(--s4)' }}>
        <div className="wrap split split--rail-right">
          <div id="job-main">{main}</div>
          <aside id="job-rail" aria-label="About the company">{rail}</aside>
        </div>
      </section>
    </>
  );
}

export default function Job() {
  const { id } = useParams();
  const toast = useToast();
  const { status, error, reload, jobs, prep, domain } = useBoard();
  const { has, toggle } = useSaved();

  const job = status === 'ready' ? jobById(jobs, id) : undefined;
  const jobId = job?.id;

  usePageMeta(job ? `${job.title} at ${job.companyName} — Nexjob` : 'Role — Nexjob', DESCRIPTION);

  useEffect(() => {
    if (jobId !== undefined) api.pushRecent(jobId);
  }, [jobId]);

  if (status === 'loading') return <Frame main={<div className="skeleton" style={{ height: 320 }} />} />;

  if (status === 'error') {
    return <Frame main={<LoadError title="The role did not load" error={error} onRetry={reload} />} />;
  }

  if (!job) {
    return (
      <Frame main={
        <div className="empty">
          <h3>That role is not on the board</h3>
          <p>It may have been closed, or the link may be wrong. The rest of the board is still open.</p>
          <Link className="btn btn--primary" to="/jobs">Browse open roles</Link>
        </div>
      } />
    );
  }

  const saved = has(job.id);
  const boardMedian = median(jobs.map((j) => j.salaryMid));
  const company = job.company;
  const route = prepFor(prep, job.companyId);

  const similar = jobs
    .filter((j) => j.id !== job.id && (j.discipline === job.discipline || j.companyId === job.companyId))
    .sort((a, b) => Math.abs(a.salaryMid - job.salaryMid) - Math.abs(b.salaryMid - job.salaryMid))
    .slice(0, 4);

  const openHere = jobsAtCompany(jobs, company.id).length;

  /* `Promise.resolve().then` turns a synchronous failure — no clipboard API on
     an insecure origin — into a rejection the same .catch handles. */
  const share = () => Promise.resolve()
    .then(() => navigator.clipboard.writeText(window.location.href))
    .then(() => toast('Link copied', 'ok'))
    .catch(() => toast('Copy the address bar to share this role'));

  const main = (
    <>
      <div className="card">
        <div className="job-hero">
          <span className="mark mark--lg" aria-hidden="true"
                style={{ background: company.brandBg, color: company.brandFg }}>
            {company.initial}
          </span>

          <div className="job-hero-titles">
            <h1>{job.title}</h1>
            <p style={{ marginTop: 'var(--s2)', color: 'var(--ink-2)' }}>
              <Link to={`/companies/${company.id}`}>{company.name}</Link>
              {' '}· {job.location} · {job.type}
            </p>

            <div className="job-meta">
              {job.featured && <span className="pill pill--blue">Featured</span>}
              <span className="pill">{job.level}</span>
              <span className="pill">{job.discipline}</span>
              {job.remote && <span className="pill pill--ok">Remote</span>}
              <span className="pill">Posted {relTime(job.postedAt)}</span>
            </div>
          </div>

          <div className="row row--tight" style={{ marginLeft: 'auto' }}>
            <button type="button" className="btn btn--outline btn--sm" aria-pressed={saved}
                    onClick={() => toggle(job.id)}>
              <BookmarkIcon filled={saved} /><span>{saved ? 'Saved' : 'Save'}</span>
            </button>
            <button type="button" className="btn btn--outline btn--sm" onClick={share}>
              <Icon name="share" size={15} />Share
            </button>
          </div>
        </div>

        <div style={{ marginTop: 'var(--s7)' }}>
          <PayScaleFull job={job} domain={domain} marketMedian={boardMedian} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 'var(--s4)' }}>
        <div className="detail-block">
          <h2>About the role</h2>
          <p style={{ color: 'var(--ink-2)', fontSize: 'var(--t-sm)', lineHeight: 1.6 }}>{job.summary}</p>
        </div>

        <div className="detail-block">
          <h2>What you will do</h2>
          <ul className="bullets">
            {(job.responsibilities || []).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>

        <div className="detail-block">
          <h2>What they are looking for</h2>
          <ul className="bullets">
            {(job.requirements || []).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>

        {(company.perks || []).length > 0 && (
          <div className="detail-block">
            <h2>What {company.name} offers</h2>
            <ul className="bullets">
              {company.perks.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        )}

        <div className="detail-block">
          <h2>Skills named in this posting</h2>
          <div className="job-tags">
            {(job.tags || []).map((tag) => (
              <Link key={tag} className="tag" to={link('/jobs', { q: tag })} style={{ textDecoration: 'none' }}>
                {tag}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 'var(--s4)' }}><ApplyPanel job={job} /></div>
    </>
  );

  const rail = (
    <div className="rail-sticky stack">
      <div className="card">
        <div className="row" style={{ gap: 'var(--s3)' }}>
          <span className="mark" aria-hidden="true" style={{ background: company.brandBg, color: company.brandFg }}>
            {company.initial}
          </span>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 600 }}>{company.name}</p>
            <p className="tick">{company.industry}</p>
          </div>
        </div>

        <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', marginTop: 'var(--s4)' }}>{company.tagline || ''}</p>

        <dl className="co-facts" style={{ marginTop: 'var(--s5)', gridTemplateColumns: 'repeat(2,1fr)' }}>
          <div className="co-fact"><dt className="tick">Size</dt><dd className="co-fact-value">{company.size}</dd></div>
          <div className="co-fact"><dt className="tick">Base</dt><dd className="co-fact-value">{company.hq}</dd></div>
        </dl>

        <div className="stack-2" style={{ marginTop: 'var(--s5)' }}>
          <Link className="btn btn--outline btn--block btn--sm" to={`/companies/${company.id}`}>
            {openHere} open {openHere === 1 ? 'role' : 'roles'} at {company.name}
          </Link>
          {route && (
            <Link className="btn btn--outline btn--block btn--sm" to={link('/prep', { company: company.id })}>
              How to get in
            </Link>
          )}
        </div>
      </div>

      {route && (
        <div className="card">
          <p className="tick">Hiring bar</p>
          <div className="row row--split" style={{ margin: 'var(--s2) 0 5px' }}>
            <span style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)' }}>
              {route.loopWeeks} weeks, {route.stages.length} stages
            </span>
            <span className="figure" style={{ fontSize: 'var(--t-xs)' }}>{route.bar}/100</span>
          </div>
          <div className="meter"><div className="meter-fill" style={{ '--v': `${route.bar}%` }} /></div>
          <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', marginTop: 'var(--s4)' }}>
            {route.focus[0].topic} carries the most weight in this loop.
          </p>
        </div>
      )}

      {similar.length > 0 && (
        <div>
          <p className="tick" style={{ marginBottom: 'var(--s3)' }}>Similar pay, similar work</p>
          <div className="stack-2">
            {similar.map((j) => <JobCardMini key={j.id} job={j} />)}
          </div>
        </div>
      )}
    </div>
  );

  return <Frame main={main} rail={rail} />;
}
