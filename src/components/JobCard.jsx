/**
 * A job listing card. The whole card is one link (the title's ::after
 * stretches over it), with the save button sitting above it.
 */

import { money, relTime } from '../lib/format.js';
import { PayScale } from './PayScale.jsx';
import Mark from './Mark.jsx';
import Icon from './Icon.jsx';
import { Link } from 'react-router';

/**
 * @param {Object}   job
 * @param {Object}   domain   the board's pay range, for the scale
 * @param {number}   index    the number in the left gutter (optional)
 * @param {boolean}  saved    is the bookmark filled
 * @param {Function} onSave   called with the job id when the bookmark is clicked
 */
export default function JobCard({ job, domain, index, saved = false, onSave }) {
  const isNew = !job.featured && (job.postedHoursAgo ?? 999) <= 24;

  return (
    <article className={job.featured ? 'job is-featured' : 'job'}>
      <div className="job-index" aria-hidden="true">
        {index === undefined ? '' : String(index).padStart(2, '0')}
      </div>

      <div className="job-body">
        <div className="job-head">
          <Mark company={job.company} />

          <div className="job-titles">
            <h3 className="job-title"><Link to={`/job?id=${job.id}`}>{job.title}</Link></h3>
            <p className="job-org">{job.companyName} · {job.location} · {job.type}</p>
          </div>

          <button type="button" className="ibtn job-save" aria-pressed={saved}
                  aria-label={`${saved ? 'Remove' : 'Save'} ${job.title} at ${job.companyName}`}
                  onClick={() => onSave?.(job.id)}>
            <Icon name="bookmark" filled={saved} />
          </button>
        </div>

        <p className="job-sum">{job.summary}</p>

        <div className="job-pay">
          <div className="job-pay-figures">
            <span className="figure">{money(job.salaryMin)} – {money(job.salaryMax)}</span>
            <span className="tick">{job.level} · {job.discipline}</span>
          </div>
          <PayScale min={job.salaryMin} max={job.salaryMax} domain={domain} />
        </div>

        <div className="job-tags">
          {(job.tags || []).slice(0, 3).map((tag, i) => <span className="tag" key={i}>{tag}</span>)}
        </div>

        <div className="job-foot">
          <div className="job-foot-meta">
            {job.featured && <span className="pill pill--blue">Featured</span>}
            {isNew && <span className="pill pill--flag pill--dot">New</span>}
            <span className="tick">{relTime(job.postedAt)}</span>
            {job.remote && <span className="tick">Remote</span>}
          </div>
          <span className="tick tick--blue">View role</span>
        </div>
      </div>
    </article>
  );
}

/** A small card for sidebars and "recently viewed". */
export function JobCardMini({ job }) {
  return (
    <Link className="card" to={`/job?id=${job.id}`}
       style={{ display: 'flex', gap: 'var(--s3)', textDecoration: 'none', padding: 'var(--s4)' }}>
      <Mark company={job.company} size="sm" />
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 'var(--t-sm)', fontWeight: 600, color: 'var(--ink)' }}>
          {job.title}
        </span>
        <span className="tick" style={{ display: 'block', marginTop: 3 }}>
          {job.companyName} · {money(job.salaryMin)}–{money(job.salaryMax)}
        </span>
      </span>
    </Link>
  );
}

/** Grey placeholder blocks while the data loads. */
export function Skeletons({ count }) {
  return Array.from({ length: count }, (_, i) => <div className="skeleton" key={i} />);
}
