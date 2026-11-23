/**
 * Home page. Every figure here is counted from the listings, nothing is typed in by hand.
 */

import { Link, useNavigate } from 'react-router';
import { useBoardData, useSaved } from '../lib/hooks.js';
import { sortJobs, payRange } from '../lib/data.js';
import { money, median, plural, posOn } from '../lib/format.js';
import { pageUrl } from '../lib/url.js';
import BootCover from '../components/BootCover.jsx';
import JobCard, { Skeletons } from '../components/JobCard.jsx';
import { PayScaleRow, PayAxis } from '../components/PayScale.jsx';
import Stats from '../components/Stats.jsx';
import Mark from '../components/Mark.jsx';
import LoadError from '../components/LoadError.jsx';
import Icon from '../components/Icon.jsx';

const QUICK_SEARCHES = ['React', 'Python', 'Design systems', 'Remote'];

export default function Home() {
  const navigate = useNavigate();
  const { data, failed } = useBoardData();
  const [saved, toggleSave] = useSaved();

  const search = (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    navigate(pageUrl('/jobs', { q: form.get('q').trim(), where: form.get('where').trim() }));
  };

  return (
    <>
      <BootCover loaded={data !== null} failed={failed} />

      {/* Hero */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <p className="tick tick--flag">
              {data
                ? `${plural(data.jobs.length, 'open role')} · ${plural(data.companies.length, 'company', 'companies')} · sample data`
                : 'Loading the board…'}
            </p>

            <h1 className="display display--hero">Every salary<br />on one scale.</h1>

            <p className="hero-lede">
              Most job boards print pay as a string and leave you to do the comparing.
              Nexjob draws every band on the same ruler, so one look tells you where a
              role really sits — before you spend an evening on the application.
            </p>

            <form className="hero-search" role="search" onSubmit={search}>
              <div className="hero-search-field">
                <Icon name="search" />
                <label className="visually-hidden" htmlFor="hero-q">Role, skill or company</label>
                <input className="input" type="search" id="hero-q" name="q" placeholder="Role, skill or company"
                       autoComplete="off" />
              </div>

              <div className="hero-search-field">
                <Icon name="pin" />
                <label className="visually-hidden" htmlFor="hero-where">Location</label>
                <input className="input" type="search" id="hero-where" name="where" placeholder="Location, or remote"
                       autoComplete="off" />
              </div>

              <button className="btn btn--primary" type="submit">Search</button>
            </form>

            <div className="row row--tight hero-quick">
              <span className="tick">Try</span>
              {QUICK_SEARCHES.map((term) => (
                <button type="button" className="chip" key={term}
                        onClick={() => navigate(pageUrl('/jobs', { q: term }))}>
                  {term}
                </button>
              ))}
            </div>
          </div>

          {/* The whole board at once: one line per open role, cheapest at the top. */}
          <figure className="spectrum" aria-labelledby="spectrum-cap">
            <figcaption className="spectrum-head">
              <span className="tick tick--ink">The board, drawn to scale</span>
              <span className="tick" id="spectrum-cap">One line per open role</span>
            </figcaption>
            <div className="spectrum-rows">{data && <Spectrum {...data} />}</div>
            <div>{data && <PayAxis domain={data.domain} count={4} />}</div>
          </figure>
        </div>
      </section>

      <div className="wrap"><div className="rule--major" /></div>

      {/* Figures */}
      <section className="strip strip--tight" aria-label="Board summary">
        <div className="wrap">
          <Stats items={data ? boardStats(data) : []} />
        </div>
      </section>

      {/* Featured */}
      <section className="strip" aria-labelledby="featured-title">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h2 id="featured-title">Worth a look</h2>
              <p>Roles the hiring team flagged, newest first.</p>
            </div>
            <Link className="btn btn--outline btn--sm" to="/jobs">All roles</Link>
          </div>

          <div className="stack">
            {failed && <LoadError title="The listings did not load" />}
            {!data && !failed && <Skeletons count={3} />}
            {data && <Featured data={data} saved={saved} onSave={toggleSave} />}
          </div>
        </div>
      </section>

      {/* Pay by discipline */}
      <section className="strip strip--panel" aria-labelledby="disc-title">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h2 id="disc-title">What each discipline pays</h2>
              <p>Floor to ceiling across every open role, on the same scale as the cards above.</p>
            </div>
            <Link className="btn btn--outline btn--sm" to="/salaries">Open the pay explorer</Link>
          </div>

          <div className="stack">
            {data && disciplineRows(data.jobs).map((row) => <PayScaleRow key={row.label} row={row} domain={data.domain} />)}
          </div>
          <div style={{ marginTop: 'var(--s4)' }}>{data && <PayAxis domain={data.domain} />}</div>
        </div>
      </section>

      {/* How it works */}
      <section className="strip" id="how" aria-labelledby="how-title">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h2 id="how-title">How Nexjob works</h2>
              <p>Four steps, in the order you actually do them.</p>
            </div>
          </div>

          <ol className="steps how-steps">
            <li className="step">
              <div className="step-body">
                <p className="step-title">Compare before you apply</p>
                <p className="step-detail">
                  Filter by pay on a ruler rather than a dropdown, and see every band
                  against the same domain. A role paying under the market shows it
                  immediately.
                </p>
              </div>
            </li>
            <li className="step">
              <div className="step-body">
                <p className="step-title">Check what it takes to get in</p>
                <p className="step-detail">
                  Each company has a page covering its interview loop stage by stage,
                  what the rounds actually weight, and the internships and assessments
                  it runs. <Link to="/prep">See the routes</Link>.
                </p>
              </div>
            </li>
            <li className="step">
              <div className="step-body">
                <p className="step-title">Apply, and watch the pipeline</p>
                <p className="step-detail">
                  Every application you send sits on a track — applied, screening,
                  interview, offer — so you always know which ones are still moving.
                </p>
              </div>
            </li>
            <li className="step">
              <div className="step-body">
                <p className="step-title">Let the board come to you</p>
                <p className="step-detail">
                  Fill in your profile once and the dashboard scores new roles against
                  your skills, with the reasons shown rather than hidden.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* Get in */}
      <section className="strip strip--panel" aria-labelledby="prep-title">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h2 id="prep-title">Know the route in</h2>
              <p>The loop, the focus areas and the current intake for each company hiring here.</p>
            </div>
            <Link className="btn btn--outline btn--sm" to="/prep">All routes</Link>
          </div>

          <div className="grid-cards">{data && <PrepTeasers {...data} />}</div>
        </div>
      </section>

      {/* Employers */}
      <section className="strip">
        <div className="wrap">
          <div className="cta">
            <div>
              <h2>Hiring?</h2>
              <p>
                Post a role with a real band on it. Listings without a salary range get
                skipped here, so we ask for one up front — then you get an applicant
                pipeline you can actually move people through.
              </p>
            </div>
            <div className="row">
              <Link className="btn btn--primary btn--lg" to="/post-job">Post a role</Link>
              <Link className="btn btn--outline btn--lg" to="/employer">Employer dashboard</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Spectrum({ jobs, domain }) {
  const bySalary = [...jobs].sort((a, b) => a.salaryMid - b.salaryMid);

  return bySalary.map((job, i) => {
    const pay = `${money(job.salaryMin)} to ${money(job.salaryMax)}`;
    return (
      <Link className="spectrum-row" to={`/job?id=${job.id}`} key={job.id}
         title={`${job.title} at ${job.companyName} — ${pay}`}
         style={{
           '--lo': `${posOn(job.salaryMin, domain).toFixed(2)}%`,
           '--hi': `${posOn(job.salaryMax, domain).toFixed(2)}%`,
           '--i': String(i)
         }}>
        <span className="visually-hidden">{job.title} at {job.companyName}, {pay}</span>
      </Link>
    );
  });
}

const boardStats = ({ jobs, companies }) => {
  const remote = jobs.filter((j) => j.remote).length;
  return [
    ['Open roles', jobs.length, 'across the board'],
    ['Companies', companies.length, 'currently hiring'],
    ['Remote', `${Math.round((remote / jobs.length) * 100)}%`, `${remote} of ${jobs.length} roles`],
    ['Median midpoint', money(median(jobs.map((j) => j.salaryMid))), 'base salary, USD']
  ];
};

function Featured({ data, saved, onSave }) {
  const featured = sortJobs(data.jobs.filter((j) => j.featured), 'newest').slice(0, 3);

  if (!featured.length) return <p className="tick">No featured roles right now.</p>;

  return featured.map((job, i) => (
    <JobCard key={job.id} job={job} index={i + 1} domain={data.domain}
             saved={saved.includes(Number(job.id))} onSave={onSave} />
  ));
}

/** One row per discipline, highest paying first. */
const disciplineRows = (jobs) => [...new Set(jobs.map((j) => j.discipline))]
  .map((name) => {
    const group = jobs.filter((j) => j.discipline === name);
    return { label: name, count: group.length, ...payRange(group), mid: median(group.map((j) => j.salaryMid)) };
  })
  .sort((a, b) => b.mid - a.mid);

/** The three companies with the highest hiring bar. */
function PrepTeasers({ prep, companies }) {
  const hardest = [...prep].sort((a, b) => b.bar - a.bar).slice(0, 3);

  return hardest.map((entry) => {
    const company = companies.find((c) => c.id === entry.companyId);
    const openNow = entry.openings.filter((o) => o.status === 'open').length;

    return (
      <Link className="card prep-teaser" to={`/prep?company=${entry.companyId}`} key={entry.companyId}>
        <div className="row" style={{ gap: 'var(--s3)' }}>
          <Mark company={company} />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 600 }}>{company.name}</p>
            <p className="tick">{entry.loopWeeks} weeks, {entry.stages.length} stages</p>
          </div>
        </div>

        <div style={{ marginTop: 'var(--s4)' }}>
          <div className="row row--split" style={{ marginBottom: 5 }}>
            <span className="tick">Hiring bar</span>
            <span className="figure" style={{ fontSize: 'var(--t-xs)' }}>{entry.bar}/100</span>
          </div>
          <div className="meter"><div className="meter-fill" style={{ '--v': `${entry.bar}%` }} /></div>
        </div>

        <p className="prep-teaser-note">{entry.focus[0].topic} carries the most weight.</p>

        {openNow
          ? <span className="pill pill--flag pill--dot">{plural(openNow, 'intake')} open</span>
          : <span className="pill">No open intake</span>}
      </Link>
    );
  });
}
