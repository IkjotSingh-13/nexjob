/**
 * One role: the details, its pay against the whole board, and the application form.
 */

import { useEffect, useState } from 'react';
import { useBoardData, useSaved } from '../lib/hooks.js';
import { jobById, jobsAtCompany, prepFor } from '../lib/data.js';
import { money, relTime, dateShort, median } from '../lib/format.js';
import { getParam, pageUrl } from '../lib/url.js';
import {
  pushRecent, hasApplied, addApplication, applicationsFor, stageIndex, stageLabel, getProfile
} from '../lib/store.js';
import { currentUser } from '../lib/auth.js';
import { fakeServer } from '../lib/promise.js';
import { toast } from '../lib/toast.js';
import { PayScale, PayAxis, MidpointNote } from '../components/PayScale.jsx';
import { JobCardMini } from '../components/JobCard.jsx';
import { Pipeline } from '../components/Pipeline.jsx';
import Mark from '../components/Mark.jsx';
import Icon from '../components/Icon.jsx';

export default function Job() {
  const { data, failed } = useBoardData();
  const [saved, toggleSave] = useSaved();
  const job = data ? jobById(data.jobs, getParam('id')) : null;

  /* Remember the visit for "Recently viewed", and name the browser tab. */
  useEffect(() => {
    if (!job) return;
    pushRecent(job.id);
    document.title = `${job.title} at ${job.companyName} — Nexjob`;
  }, [job]);

  let main = <div className="skeleton" style={{ height: 320 }} />;
  let rail = null;

  if (failed || (data && !job)) {
    main = (
      <div className="empty">
        <h3>That role is not on the board</h3>
        <p>It may have been closed, or the link may be wrong. The rest of the board is still open.</p>
        <a className="btn btn--primary" href="./jobs.html">Browse open roles</a>
      </div>
    );
  } else if (job) {
    main = <JobDetails job={job} data={data} saved={saved.includes(Number(job.id))} onSave={toggleSave} />;
    rail = <JobRail job={job} data={data} />;
  }

  return (
    <>
      <div className="wrap" style={{ paddingTop: 'var(--s5)' }}>
        <a className="tick" href="./jobs.html" style={{ textDecoration: 'none' }}>&larr; All roles</a>
      </div>

      <section className="strip strip--tight" style={{ paddingTop: 'var(--s4)' }}>
        <div className="wrap split split--rail-right">
          <div>{main}</div>
          <aside aria-label="About the company">{rail}</aside>
        </div>
      </section>
    </>
  );
}

function JobDetails({ job, data, saved, onSave }) {
  const company = job.company;
  const boardMid = median(data.jobs.map((j) => j.salaryMid));

  const share = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      toast('Link copied', 'ok');
    } catch {
      toast('Copy the address bar to share this role');
    }
  };

  return (
    <>
      <div className="card">
        <div className="job-hero">
          <Mark company={company} size="lg" />

          <div className="job-hero-titles">
            <h1>{job.title}</h1>
            <p style={{ marginTop: 'var(--s2)', color: 'var(--ink-2)' }}>
              <a href={`./company.html?id=${company.id}`}>{company.name}</a> · {job.location} · {job.type}
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
            <button type="button" className="btn btn--outline btn--sm" aria-pressed={saved} onClick={() => onSave(job.id)}>
              <Icon name="bookmark" filled={saved} /><span>{saved ? 'Saved' : 'Save'}</span>
            </button>
            <button type="button" className="btn btn--outline btn--sm" onClick={share}>
              <Icon name="share" size={15} />Share
            </button>
          </div>
        </div>

        {/* The band, drawn against every other role on the board. */}
        <div style={{ marginTop: 'var(--s7)' }}>
          <div className="scale-legend">
            <span className="figure" style={{ fontSize: 'var(--t-lg)' }}>{money(job.salaryMin)} – {money(job.salaryMax)}</span>
            <span className="tick">Base salary, per year, USD</span>
          </div>

          <PayScale min={job.salaryMin} max={job.salaryMax} domain={data.domain} size="lg" />
          <PayAxis domain={data.domain} />

          <p className="tick" style={{ marginTop: 'var(--s3)', color: 'var(--ink-2)', textTransform: 'none', letterSpacing: 0 }}>
            <MidpointNote mid={job.salaryMid} boardMid={boardMid}>
              the {money(boardMid)} midpoint across every role on the board.
            </MidpointNote>
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 'var(--s4)' }}>
        <div className="detail-block">
          <h2>About the role</h2>
          <p style={{ color: 'var(--ink-2)', fontSize: 'var(--t-sm)', lineHeight: 1.6 }}>{job.summary}</p>
        </div>

        <div className="detail-block">
          <h2>What you will do</h2>
          <Bullets items={job.responsibilities} />
        </div>

        <div className="detail-block">
          <h2>What they are looking for</h2>
          <Bullets items={job.requirements} />
        </div>

        {company.perks?.length > 0 && (
          <div className="detail-block">
            <h2>What {company.name} offers</h2>
            <Bullets items={company.perks} />
          </div>
        )}

        <div className="detail-block">
          <h2>Skills named in this posting</h2>
          <div className="job-tags">
            {(job.tags || []).map((tag, i) => (
              <a className="tag" href={pageUrl('jobs.html', { q: tag })} style={{ textDecoration: 'none' }} key={i}>{tag}</a>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 'var(--s4)' }}><ApplyPanel job={job} /></div>
    </>
  );
}

function Bullets({ items = [] }) {
  return <ul className="bullets">{items.map((item, i) => <li key={i}>{item}</li>)}</ul>;
}

/** Sign-in prompt, the application form, or where your application has got to. */
function ApplyPanel({ job }) {
  const user = currentUser();
  const [application, setApplication] = useState(() =>
    user && applicationsFor(user.id).find((a) => Number(a.jobId) === Number(job.id)));
  const [sending, setSending] = useState(false);

  if (!user) {
    return (
      <div className="card">
        <h2 style={{ fontSize: 'var(--t-lg)' }}>Apply for this role</h2>
        <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', margin: 'var(--s3) 0 var(--s5)' }}>
          Sign in first so your application lands on your pipeline and you can follow
          what happens to it.
        </p>
        <a className="btn btn--primary" href={`./auth.html?next=${encodeURIComponent(`job.html?id=${job.id}`)}`}>
          Sign in to apply
        </a>
      </div>
    );
  }

  if (application) {
    const { stage, appliedAt } = application;
    return (
      <div className="card">
        <div className="row row--split" style={{ marginBottom: 'var(--s5)' }}>
          <h2 style={{ fontSize: 'var(--t-lg)' }}>Your application</h2>
          <span className={`pill ${stage === 'closed' ? 'pill--stop' : 'pill--flag'} pill--dot`}>{stageLabel(stage)}</span>
        </div>

        <Pipeline stage={stage} />

        <p className="tick" style={{ marginTop: 'var(--s5)', textTransform: 'none', letterSpacing: 0, color: 'var(--ink-2)' }}>
          Sent {relTime(appliedAt)} · {dateShort(appliedAt)}
          {stageIndex(stage) > 0 && ` · moved to ${stageLabel(stage).toLowerCase()} since`}
        </p>

        <div className="row" style={{ marginTop: 'var(--s5)' }}>
          <a className="btn btn--outline btn--sm" href="./dashboard.html#applications">Open your pipeline</a>
        </div>
      </div>
    );
  }

  const send = (event) => {
    event.preventDefault();

    if (hasApplied(job.id, user.id)) {
      toast('You have already applied for this role');
      return;
    }

    const form = new FormData(event.target);
    const details = {
      jobId: job.id,
      userId: user.id,
      jobTitle: job.title,
      companyId: job.companyId,
      companyName: job.companyName,
      name: form.get('name').trim(),
      email: form.get('email').trim(),
      link: form.get('link').trim(),
      note: form.get('note').trim()
    };

    setSending(true);                                   // jawab aane tak button band

    fakeServer(() => addApplication(details))
      .then((record) => {                               // Promise resolve hua: application save ho gayi
        toast('Application sent', 'ok');
        setApplication(record);
      })
      .catch((error) => toast(error.message, 'stop'))   // Promise reject hua: error dikhao
      .finally(() => setSending(false));                // dono case mein: button wapas theek
  };

  const links = getProfile(user.id).links;

  return (
    <div className="card">
      <h2 style={{ fontSize: 'var(--t-lg)' }}>Apply for this role</h2>
      <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', margin: 'var(--s3) 0 var(--s5)' }}>
        Applying adds this role to your pipeline so you can follow it from here.
      </p>

      <form className="stack" onSubmit={send}>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="apply-name">Full name</label>
            <input className="input" type="text" id="apply-name" name="name" required
                   defaultValue={user.name} autoComplete="name" />
          </div>

          <div className="field">
            <label htmlFor="apply-email">Email address</label>
            <input className="input" type="email" id="apply-email" name="email" required
                   defaultValue={user.email} autoComplete="email" />
          </div>
        </div>

        <div className="field">
          <label htmlFor="apply-link">Portfolio, CV or GitHub</label>
          <input className="input" type="url" id="apply-link" name="link" placeholder="https://"
                 defaultValue={links.github || links.website || ''} />
        </div>

        <div className="field">
          <label htmlFor="apply-note">Why this role</label>
          <textarea className="textarea" id="apply-note" name="note" rows="4"
                    placeholder="A few lines on why you want it and what you would bring." />
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

/** The sidebar: the company, its hiring bar, and similar roles. */
function JobRail({ job, data }) {
  const company = job.company;
  const route = prepFor(data.prep, job.companyId);
  const openHere = jobsAtCompany(data.jobs, company.id).length;

  /* Same discipline or same company, closest in pay first. */
  const similar = data.jobs
    .filter((j) => j.id !== job.id && (j.discipline === job.discipline || j.companyId === job.companyId))
    .sort((a, b) => Math.abs(a.salaryMid - job.salaryMid) - Math.abs(b.salaryMid - job.salaryMid))
    .slice(0, 4);

  return (
    <div className="rail-sticky stack">
      <div className="card">
        <div className="row" style={{ gap: 'var(--s3)' }}>
          <Mark company={company} />
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
          <a className="btn btn--outline btn--block btn--sm" href={`./company.html?id=${company.id}`}>
            {openHere} open {openHere === 1 ? 'role' : 'roles'} at {company.name}
          </a>
          {route && (
            <a className="btn btn--outline btn--block btn--sm" href={`./prep.html?company=${company.id}`}>
              How to get in
            </a>
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
          <div className="stack-2">{similar.map((j) => <JobCardMini job={j} key={j.id} />)}</div>
        </div>
      )}
    </div>
  );
}
