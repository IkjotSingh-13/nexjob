/**
 * The listing card.
 *
 * One set of markup. On a phone it is a card; from 720px an index gutter
 * opens on the left and the row takes its place in the ledger. The card is a
 * single link target — the title's ::after covers the card — with the save
 * button lifted above it so both stay reachable by keyboard.
 */

import { Link } from 'react-router-dom';
import { money, relTime } from '../lib/format.js';
import { useSaved } from '../hooks/useSaved.js';
import { PayScale } from './PayScale.jsx';
import { BookmarkIcon } from './Icon.jsx';

function Flag({ job }) {
  if (job.featured) return <span className="pill pill--blue">Featured</span>;
  if ((job.postedHoursAgo ?? 999) <= 24) return <span className="pill pill--flag pill--dot">New</span>;
  return null;
}

/**
 * @param {{job: Object, index?: number, domain: Object, showScale?: boolean,
 *          preview?: boolean}} props  `preview` draws the card inert, for the
 *          post-a-role form, where the listing does not exist yet.
 */
export function JobCard({ job, index, domain, showScale = true, preview = false }) {
  const { has, toggle } = useSaved();

  const saved = !preview && has(job.id);
  const label = `${saved ? 'Remove' : 'Save'} ${job.title} at ${job.companyName}`;

  return (
    <article className={`job${job.featured ? ' is-featured' : ''}`}>
      <div className="job-index" aria-hidden="true">
        {index === undefined ? '' : String(index).padStart(2, '0')}
      </div>

      <div className="job-body">
        <div className="job-head">
          <span className="mark" aria-hidden="true"
                style={{ background: job.company.brandBg, color: job.company.brandFg }}>
            {job.company.initial}
          </span>

          <div className="job-titles">
            <h3 className="job-title">
              {preview ? job.title : <Link to={`/jobs/${job.id}`}>{job.title}</Link>}
            </h3>
            <p className="job-org">{job.companyName} · {job.location} · {job.type}</p>
          </div>

          <button type="button" className="ibtn job-save" aria-pressed={saved} aria-label={label}
                  disabled={preview} onClick={() => toggle(job.id)}>
            <BookmarkIcon filled={saved} />
          </button>
        </div>

        <p className="job-sum">{job.summary}</p>

        {showScale && (
          <div className="job-pay">
            <div className="job-pay-figures">
              <span className="figure">{money(job.salaryMin)} – {money(job.salaryMax)}</span>
              <span className="tick">{job.level} · {job.discipline}</span>
            </div>
            <PayScale min={job.salaryMin} max={job.salaryMax} domain={domain} />
          </div>
        )}

        <div className="job-tags">
          {(job.tags || []).slice(0, 3).map((tag) => <span key={tag} className="tag">{tag}</span>)}
        </div>

        <div className="job-foot">
          <div className="job-foot-meta">
            <Flag job={job} />
            <span className="tick">{relTime(job.postedAt)}</span>
            {job.remote && <span className="tick">Remote</span>}
          </div>
          <span className="tick tick--blue">View role</span>
        </div>
      </div>
    </article>
  );
}

/** A tighter version for sidebars and "similar roles" strips. */
export function JobCardMini({ job }) {
  return (
    <Link className="card" to={`/jobs/${job.id}`}
          style={{ display: 'flex', gap: 'var(--s3)', textDecoration: 'none', padding: 'var(--s4)' }}>
      <span className="mark mark--sm" aria-hidden="true"
            style={{ background: job.company.brandBg, color: job.company.brandFg }}>
        {job.company.initial}
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 'var(--t-sm)', fontWeight: 600, color: 'var(--ink)' }}>{job.title}</span>
        <span className="tick" style={{ display: 'block', marginTop: 3 }}>
          {job.companyName} · {money(job.salaryMin)}–{money(job.salaryMax)}
        </span>
      </span>
    </Link>
  );
}

/** Loading placeholders, so the list does not jump when data arrives. */
export function Skeletons({ count = 4 }) {
  return Array.from({ length: count }, (_, i) => <div key={i} className="skeleton" />);
}
