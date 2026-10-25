/**
 * Employer dashboard.
 *
 * The other side of the same pipeline the seeker sees. Moving someone from
 * screening to interview here changes what shows on their dashboard, which is
 * the point of both sides reading one store.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBoard } from '../context/BoardContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { companyById, jobsAtCompany } from '../lib/jobs.js';
import { CLOSED_STAGE, stageLabel } from '../lib/stages.js';
import { money, relTime, dateShort, plural } from '../lib/format.js';
import * as api from '../services/api.js';
import { usePageMeta } from '../hooks/usePageMeta.js';
import { useAllApplications, usePostings } from '../hooks/useStore.js';
import { StagePicker } from '../components/Pipeline.jsx';
import { PayScale } from '../components/PayScale.jsx';
import { LoadError } from '../components/LoadError.jsx';
import { Icon } from '../components/Icon.jsx';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'closed', label: 'Closed' }
];

/* --------------------------------------------------------------- Table */

function ApplicantTable({ applications, compact = false, moving, onMove }) {
  if (!applications.length) {
    return <p className="tick" style={{ padding: 'var(--s4) 0' }}>No applicants yet.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Applicant</th>
            {!compact && <th scope="col">Role</th>}
            <th scope="col">Applied</th>
            <th scope="col">Link</th>
            <th scope="col">Stage</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => {
            const pending = moving?.id === application.id;

            return (
              <tr key={application.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{application.name}</div>
                  <div className="tick" style={{ marginTop: 2 }}>{application.email}</div>
                </td>
                {!compact && <td>{application.jobTitle}</td>}
                <td className="tick">{dateShort(application.appliedAt)}</td>
                <td>
                  {application.link
                    ? <a href={application.link} rel="noopener noreferrer" target="_blank">Open</a>
                    : <span className="tick">None</span>}
                </td>
                <td>
                  <StagePicker
                    value={pending ? moving.stage : application.stage}
                    disabled={pending}
                    onChange={(stage) => onMove(application.id, stage)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------------------------------------------------------- Page */

export default function Employer() {
  const { user } = useAuth();
  const toast = useToast();
  const { status, error, reload, jobs, companies, domain } = useBoard();
  const postings = usePostings();
  const allApplications = useAllApplications();

  const [filter, setFilter] = useState('all');
  const [moving, setMoving] = useState(null);         /* { id, stage } while a stage change is in flight */
  const [busyPosting, setBusyPosting] = useState(null);

  const ready = status === 'ready';
  const company = ready ? companyById(companies, user.companyId) : undefined;

  usePageMeta(
    company ? `${company.name} — Employer dashboard — Nexjob` : 'Employer dashboard — Nexjob',
    'Manage your postings and move applicants through the hiring pipeline.'
  );

  /* ---------------------------------------------------------- Derived */

  /* Everything this employer's company has on the board, own postings first. */
  const mine = new Set(postings.map((p) => p.id));

  const ourJobs = jobsAtCompany(jobs, company?.id)
    .map((job) => ({ ...job, mine: mine.has(job.id), status: job.status ?? 'open' }))
    .sort((a, b) => (b.mine === true) - (a.mine === true) || (a.postedHoursAgo ?? 0) - (b.postedHoursAgo ?? 0));

  const ourIds = ourJobs.map((j) => Number(j.id));
  const ourApplications = allApplications
    .filter((a) => ourIds.includes(Number(a.jobId)))
    .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

  const visible = ourJobs.filter((job) => filter === 'all' || job.status === filter);

  const stats = [
    ['Postings', ourJobs.filter((j) => j.status === 'open').length, `${ourJobs.length} in total`],
    ['Applicants', ourApplications.length, 'across every posting'],
    ['In interview', ourApplications.filter((a) => a.stage === 'interview').length, 'right now'],
    ['Offers out', ourApplications.filter((a) => a.stage === 'offer').length, 'awaiting a reply']
  ];

  /* ------------------------------------------------------------ Events */

  const move = (id, stage) => {
    setMoving({ id, stage });

    api.moveApplication(id, stage)
      .then((application) => toast(`Moved to ${stageLabel(application.stage).toLowerCase()}`, 'ok'))
      .catch((failure) => toast(failure.message, 'stop'))
      .finally(() => setMoving(null));
  };

  const toggle = (job) => {
    const nextStatus = job.status === 'open' ? 'closed' : 'open';
    setBusyPosting(job.id);

    api.setPostingStatus(job.id, nextStatus)
      .then(() => toast(nextStatus === 'closed' ? 'Role closed' : 'Role reopened'))
      .catch((failure) => toast(failure.message, 'stop'))
      .finally(() => setBusyPosting(null));
  };

  const remove = (job, applicationCount) => {
    const message = applicationCount
      ? `Delete “${job.title}”? ${plural(applicationCount, 'application')} will stay on the applicants' dashboards but the listing goes for good.`
      : `Delete “${job.title}”? This cannot be undone.`;

    if (!window.confirm(message)) return;

    setBusyPosting(job.id);

    api.deletePosting(job.id)
      .then(() => toast('Posting deleted'))
      .catch((failure) => toast(failure.message, 'stop'))
      .finally(() => setBusyPosting(null));
  };

  /* ----------------------------------------------------------- Render */

  let head = (
    <>
      <p className="tick tick--flag">Employer dashboard</p>
      <h1 style={{ marginTop: 'var(--s3)' }}>Loading…</h1>
    </>
  );

  if (ready && !company) {
    head = (
      <>
        <p className="tick tick--flag">Employer dashboard</p>
        <h1 style={{ marginTop: 'var(--s3)' }}>No company on this account</h1>
      </>
    );
  } else if (company) {
    head = (
      <>
        <p className="tick tick--flag">Employer dashboard</p>
        <div className="row" style={{ gap: 'var(--s3)', marginTop: 'var(--s3)' }}>
          <span className="mark" aria-hidden="true" style={{ background: company.brandBg, color: company.brandFg }}>
            {company.initial}
          </span>
          <h1>{company.name}</h1>
        </div>
        <p style={{ marginTop: 'var(--s3)', color: 'var(--ink-2)' }}>Signed in as {user.name}.</p>
      </>
    );
  }

  return (
    <>
      <section className="strip strip--tight">
        <div className="wrap">
          <div className="dash-head">
            <div id="emp-head">{head}</div>

            <div className="row row--tight">
              <Link className="btn btn--outline btn--sm" id="emp-company-link"
                    to={company ? `/companies/${company.id}` : '/companies'}>
                Company profile
              </Link>
              <Link className="btn btn--primary btn--sm" to="/post-job">Post a role</Link>
            </div>
          </div>

          <div className="stats" id="emp-stats">
            {company && stats.map(([label, figure, note]) => (
              <div key={label} className="stat">
                <span className="tick">{label}</span>
                <span className="stat-figure">{figure}</span>
                <span className="tick" style={{ textTransform: 'none', letterSpacing: 0 }}>{note}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="strip" id="postings" aria-labelledby="postings-title">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h2 id="postings-title">Your postings</h2>
              <p>Open one to review its applicants and move them along.</p>
            </div>

            <div className="seg" id="posting-filter" role="group" aria-label="Filter postings">
              {FILTERS.map((option) => (
                <button key={option.id} type="button" aria-pressed={option.id === filter}
                        onClick={() => setFilter(option.id)}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="stack" id="posting-list">
            {status === 'error' && <LoadError title="The dashboard did not load" error={error} onRetry={reload} />}

            {ready && !company && (
              <div className="empty">
                <h3>This account is not linked to a company</h3>
                <p>Create an employer account and pick a company, and your postings will appear here.</p>
                <Link className="btn btn--primary" to="/auth?tab=register&role=employer">Create an employer account</Link>
              </div>
            )}

            {company && (visible.length ? visible.map((job) => {
              const applications = allApplications.filter((a) => Number(a.jobId) === Number(job.id));
              const live = applications.filter((a) => a.stage !== CLOSED_STAGE.id).length;
              const busy = busyPosting === job.id;

              return (
                <details key={job.id} className="acc">
                  <summary>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, textAlign: 'left' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', flexWrap: 'wrap' }}>
                        {job.title}
                        <span className={`pill ${job.status === 'open' ? 'pill--ok' : 'pill--stop'} pill--dot`}>
                          {job.status === 'open' ? 'Open' : 'Closed'}
                        </span>
                        {!job.mine && <span className="pill">Sample listing</span>}
                      </span>
                      <span className="tick">
                        {job.location} · {money(job.salaryMin)}–{money(job.salaryMax)} ·{' '}
                        {plural(applications.length, 'applicant')}
                        {live !== applications.length ? ` (${live} live)` : ''}
                      </span>
                    </span>
                  </summary>

                  <div className="acc-body">
                    <div className="posting-figures" style={{ marginBottom: 'var(--s5)', flexWrap: 'wrap', gap: 'var(--s6)' }}>
                      <div className="posting-figure">
                        <span className="tick">Applicants</span>
                        <span className="posting-figure-value">{applications.length}</span>
                      </div>
                      <div className="posting-figure">
                        <span className="tick">Interviewing</span>
                        <span className="posting-figure-value">
                          {applications.filter((a) => a.stage === 'interview').length}
                        </span>
                      </div>
                      <div className="posting-figure">
                        <span className="tick">Posted</span>
                        <span className="posting-figure-value" style={{ fontSize: 'var(--t-sm)' }}>{relTime(job.postedAt)}</span>
                      </div>
                    </div>

                    <div style={{ maxWidth: 420, marginBottom: 'var(--s5)' }}>
                      <div className="row row--split" style={{ marginBottom: 5 }}>
                        <span className="tick">Band on the board's scale</span>
                        <span className="figure" style={{ fontSize: 'var(--t-xs)' }}>
                          {money(job.salaryMin)} – {money(job.salaryMax)}
                        </span>
                      </div>
                      <PayScale min={job.salaryMin} max={job.salaryMax} domain={domain} />
                    </div>

                    <ApplicantTable applications={applications} compact moving={moving} onMove={move} />

                    <div className="row" style={{ marginTop: 'var(--s5)', gap: 'var(--s2)' }}>
                      <Link className="btn btn--outline btn--sm" to={`/jobs/${job.id}`}>View the listing</Link>

                      {job.mine && (
                        <>
                          <button type="button" className="btn btn--outline btn--sm" disabled={busy}
                                  onClick={() => toggle(job)}>
                            {job.status === 'open' ? 'Close this role' : 'Reopen this role'}
                          </button>
                          <button type="button" className="btn btn--danger btn--sm" disabled={busy}
                                  onClick={() => remove(job, applications.length)}>
                            <Icon name="trash" size={14} />Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </details>
              );
            }) : (
              <div className="empty">
                <h3>{filter === 'all' ? 'Nothing posted yet' : `No ${filter} postings`}</h3>
                <p>Post a role with a real salary band and it appears on the board straight away.</p>
                <Link className="btn btn--primary" to="/post-job">Post a role</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="strip strip--panel" id="pipeline" aria-labelledby="pipeline-title">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h2 id="pipeline-title">Everyone in the pipeline</h2>
              <p>Every applicant across your postings, most recent first.</p>
            </div>
          </div>

          <div id="applicant-table">
            {company && <ApplicantTable applications={ourApplications} moving={moving} onMove={move} />}
          </div>
        </div>
      </section>
    </>
  );
}
