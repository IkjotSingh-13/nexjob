/**
 * The employer's dashboard: their postings and everyone who applied.
 *
 * Moving an applicant to a new stage here changes what that person sees on
 * their own dashboard, because both sides read the same localStorage.
 * Closing, reopening and deleting a role is saved in MySQL through the backend.
 */

import { useContext, useEffect, useState } from 'react';
import { useBoardData } from '../lib/hooks.js';
import { jobsAtCompany, companyById } from '../lib/data.js';
import { money, relTime, dateShort, plural } from '../lib/format.js';
import { getApplications, setApplicationStage, CLOSED_STAGE, stageLabel } from '../lib/store.js';
import { updateJob, deleteJob } from '../lib/api.js';
import { UserContext } from '../lib/UserContext.jsx';
import { toast } from '../lib/toast.js';
import { StagePicker } from '../components/Pipeline.jsx';
import { PayScale } from '../components/PayScale.jsx';
import Stats from '../components/Stats.jsx';
import Mark from '../components/Mark.jsx';
import LoadError from '../components/LoadError.jsx';
import Icon from '../components/Icon.jsx';
import { Link } from 'react-router';

/* Only employers get here: main.jsx wraps this page in <RequireRole role="employer">. */
export default function Employer() {
  const { user } = useContext(UserContext);
  return <EmployerDashboard user={user} />;
}

function EmployerDashboard({ user }) {
  const { data, failed, reload } = useBoardData();
  const [filter, setFilter] = useState('all');   // 'all', 'open' or 'closed'
  const [applications, setApplications] = useState(getApplications());

  const company = data ? companyById(data.companies, user.companyId) : null;

  useEffect(() => {
    if (company) {
      document.title = `${company.name} — Employer dashboard — Nexjob`;
    }
  }, [company]);

  /* How many hours ago a job was posted. 0 when it does not say. */
  const hoursAgo = (job) => {
    if (job.postedHoursAgo === undefined || job.postedHoursAgo === null) return 0;
    return job.postedHoursAgo;
  };

  /* Roles posted through the site first, then the newest. */
  const mineFirstThenNewest = (a, b) => {
    if (a.mine && !b.mine) return -1;
    if (b.mine && !a.mine) return 1;
    return hoursAgo(a) - hoursAgo(b);
  };

  /* Every role this company has on the board. Ones posted through the site (they have a
     postedBy) come first and can be edited; the sample listings cannot. */
  const ourJobs = [];
  if (company) {
    for (const job of jobsAtCompany(data.jobs, company.id)) {
      let status = 'open';   // the sample jobs from the JSON files have no status
      if (job.status !== undefined && job.status !== null) {
        status = job.status;
      }
      ourJobs.push({ ...job, mine: Boolean(job.postedBy), status: status });
    }
    ourJobs.sort(mineFirstThenNewest);
  }

  /* Everyone who applied to one of our roles, newest application first. */
  const ourIds = ourJobs.map((job) => Number(job.id));
  const ourApplications = applications.filter((a) => ourIds.includes(Number(a.jobId)));
  ourApplications.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

  /* The postings for the All / Open / Closed buttons. */
  const shownJobs = ourJobs.filter((job) => filter === 'all' || job.status === filter);

  const moveApplicant = (id, stage) => {
    setApplicationStage(id, stage);
    setApplications(getApplications());
    toast(`Moved to ${stageLabel(stage).toLowerCase()}`, 'ok');
  };

  const toggleOpen = (job) => {
    const status = job.status === 'open' ? 'closed' : 'open';

    updateJob({ ...job, status })   // saves the new status in MySQL
      .then(() => {
        toast(status === 'closed' ? 'Role closed' : 'Role reopened');
        reload();
      })
      .catch(() => toast('Could not reach the backend. Is it running?', 'stop'));
  };

  const deletePosting = (job, applicantCount) => {
    const message = applicantCount
      ? `Delete “${job.title}”? ${plural(applicantCount, 'application')} will stay on the applicants' dashboards but the listing goes for good.`
      : `Delete “${job.title}”? This cannot be undone.`;

    if (!window.confirm(message)) return;

    deleteJob(job.id)   // removes it from MySQL
      .then(() => {
        toast('Posting deleted');
        reload();
      })
      .catch(() => toast('Could not reach the backend. Is it running?', 'stop'));
  };

  return (
    <>
      <section className="strip strip--tight">
        <div className="wrap">
          <div className="dash-head">
            <div>
              <p className="tick tick--flag">Employer dashboard</p>
              {!data && <h1 style={{ marginTop: 'var(--s3)' }}>Loading…</h1>}
              {data && !company && <h1 style={{ marginTop: 'var(--s3)' }}>No company on this account</h1>}
              {company && (
                <>
                  <div className="row" style={{ gap: 'var(--s3)', marginTop: 'var(--s3)' }}>
                    <Mark company={company} />
                    <h1>{company.name}</h1>
                  </div>
                  <p style={{ marginTop: 'var(--s3)', color: 'var(--ink-2)' }}>Signed in as {user.name}.</p>
                </>
              )}
            </div>

            <div className="row row--tight">
              <Link className="btn btn--outline btn--sm" to={company ? `/company?id=${company.id}` : '/companies'}>
                Company profile
              </Link>
              <Link className="btn btn--primary btn--sm" to="/post-job">Post a role</Link>
            </div>
          </div>

          <Stats items={!company ? [] : [
            ['Postings', ourJobs.filter((j) => j.status === 'open').length, `${ourJobs.length} in total`],
            ['Applicants', ourApplications.length, 'across every posting'],
            ['In interview', ourApplications.filter((a) => a.stage === 'interview').length, 'right now'],
            ['Offers out', ourApplications.filter((a) => a.stage === 'offer').length, 'awaiting a reply']
          ]} />
        </div>
      </section>

      <section className="strip" id="postings" aria-labelledby="postings-title">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h2 id="postings-title">Your postings</h2>
              <p>Open one to review its applicants and move them along.</p>
            </div>

            <div className="seg" role="group" aria-label="Filter postings">
              {['all', 'open', 'closed'].map((status) => (
                <button type="button" key={status} aria-pressed={filter === status} onClick={() => setFilter(status)}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="stack">
            {failed && <LoadError title="The dashboard did not load" />}

            {data && !company && (
              <div className="empty">
                <h3>This account is not linked to a company</h3>
                <p>Create an employer account and pick a company, and your postings will appear here.</p>
                <Link className="btn btn--primary" to="/auth?tab=register&role=employer">Create an employer account</Link>
              </div>
            )}

            {company && shownJobs.map((job) => {
              const jobApplications = applications.filter((a) => Number(a.jobId) === Number(job.id));
              return (
                <Posting key={job.id} job={job} applications={jobApplications} domain={data.domain}
                         onMove={moveApplicant} onToggle={() => toggleOpen(job)}
                         onDelete={() => deletePosting(job, jobApplications.length)} />
              );
            })}

            {company && shownJobs.length === 0 && (
              <div className="empty">
                <h3>{filter === 'all' ? 'Nothing posted yet' : `No ${filter} postings`}</h3>
                <p>Post a role with a real salary band and it appears on the board straight away.</p>
                <Link className="btn btn--primary" to="/post-job">Post a role</Link>
              </div>
            )}
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

          <div>{company && <ApplicantTable applications={ourApplications} onMove={moveApplicant} />}</div>
        </div>
      </section>
    </>
  );
}

/** One posting, as an expanding panel with its applicants inside. */
function Posting({ job, applications, domain, onMove, onToggle, onDelete }) {
  const live = applications.filter((a) => a.stage !== CLOSED_STAGE.id).length;
  const open = job.status === 'open';

  return (
    <details className="acc">
      <summary>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, textAlign: 'left' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', flexWrap: 'wrap' }}>
            {job.title}
            <span className={`pill ${open ? 'pill--ok' : 'pill--stop'} pill--dot`}>{open ? 'Open' : 'Closed'}</span>
            {!job.mine && <span className="pill">Sample listing</span>}
          </span>
          <span className="tick">
            {job.location} · {money(job.salaryMin)}–{money(job.salaryMax)} ·{' '}
            {plural(applications.length, 'applicant')}{live !== applications.length && ` (${live} live)`}
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
            <span className="posting-figure-value">{applications.filter((a) => a.stage === 'interview').length}</span>
          </div>
          <div className="posting-figure">
            <span className="tick">Posted</span>
            <span className="posting-figure-value" style={{ fontSize: 'var(--t-sm)' }}>{relTime(job.postedAt)}</span>
          </div>
        </div>

        <div style={{ maxWidth: 420, marginBottom: 'var(--s5)' }}>
          <div className="row row--split" style={{ marginBottom: 5 }}>
            <span className="tick">Band on the board's scale</span>
            <span className="figure" style={{ fontSize: 'var(--t-xs)' }}>{money(job.salaryMin)} – {money(job.salaryMax)}</span>
          </div>
          <PayScale min={job.salaryMin} max={job.salaryMax} domain={domain} />
        </div>

        <ApplicantTable applications={applications} onMove={onMove} compact />

        <div className="row" style={{ marginTop: 'var(--s5)', gap: 'var(--s2)' }}>
          <Link className="btn btn--outline btn--sm" to={`/job?id=${job.id}`}>View the listing</Link>

          {job.mine && (
            <>
              <button type="button" className="btn btn--outline btn--sm" onClick={onToggle}>
                {open ? 'Close this role' : 'Reopen this role'}
              </button>
              <button type="button" className="btn btn--danger btn--sm" onClick={onDelete}>
                <Icon name="trash" size={14} />Delete
              </button>
            </>
          )}
        </div>
      </div>
    </details>
  );
}

/** A table of applicants with a stage dropdown each. `compact` leaves out the Role column. */
function ApplicantTable({ applications, onMove, compact = false }) {
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
          {applications.map((a) => (
            <tr key={a.id}>
              <td>
                <div style={{ fontWeight: 600 }}>{a.name}</div>
                <div className="tick" style={{ marginTop: 2 }}>{a.email}</div>
              </td>
              {!compact && <td>{a.jobTitle}</td>}
              <td className="tick">{dateShort(a.appliedAt)}</td>
              <td>
                {a.link
                  ? <a href={a.link} rel="noopener noreferrer" target="_blank">Open</a>
                  : <span className="tick">None</span>}
              </td>
              <td><StagePicker stage={a.stage} onChange={(stage) => onMove(a.id, stage)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
