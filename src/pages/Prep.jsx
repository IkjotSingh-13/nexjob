/**
 * How to get in.
 *
 * The third domain the scale grammar covers. A hiring bar is a position, an
 * interview loop is a track, and a focus area carries a weight — so this page
 * is built from the same meters and steps as the rest of the product rather
 * than a new set of shapes.
 *
 * Readiness is scored against the signed-in profile's skills, and the reasons
 * are shown rather than hidden.
 */

import { useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useBoard } from '../context/BoardContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { jobsAtCompany, prepFor, readinessFor } from '../lib/jobs.js';
import { profileCompleteness } from '../lib/profile.js';
import { money, plural } from '../lib/format.js';
import { link } from '../lib/url.js';
import { usePageMeta } from '../hooks/usePageMeta.js';
import { useProfile } from '../hooks/useStore.js';
import { LoadError } from '../components/LoadError.jsx';

const STATUS = {
  open:     ['ok',    'Open now'],
  rolling:  ['blue',  'Rolling'],
  upcoming: ['warn',  'Upcoming'],
  closed:   ['stop',  'Closed']
};

/* -------------------------------------------------------------- Pieces */

function ReadinessCard({ entry, user, profile }) {
  if (!user) {
    return (
      <div className="card">
        <p className="tick">Your readiness</p>
        <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', margin: 'var(--s3) 0 var(--s4)' }}>
          Sign in and add your skills, and this panel scores them against what this
          loop actually weights.
        </p>
        <Link className="btn btn--outline btn--block btn--sm"
              to={`/auth?next=${encodeURIComponent(link('/prep', { company: entry.companyId }))}`}>
          Sign in
        </Link>
      </div>
    );
  }

  if (!profile.skills.length) {
    return (
      <div className="card">
        <p className="tick">Your readiness</p>
        <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', margin: 'var(--s3) 0 var(--s4)' }}>
          Add a few skills to your profile and they get matched against the focus areas
          below. Your profile is {profileCompleteness(profile)}% filled in.
        </p>
        <Link className="btn btn--outline btn--block btn--sm" to="/profile">Add your skills</Link>
      </div>
    );
  }

  const { score, covered, gaps } = readinessFor(entry, profile);
  const biggestGap = [...gaps].sort((a, b) => b.weight - a.weight)[0];

  return (
    <div className="card">
      <p className="tick">Your readiness</p>

      <div className="row row--split" style={{ margin: 'var(--s3) 0 5px', alignItems: 'baseline' }}>
        <span style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)' }}>
          {covered.length} of {entry.focus.length} focus areas covered
        </span>
        <span className="figure">{score}%</span>
      </div>

      <div className="meter meter--flag"><div className="meter-fill" style={{ '--v': `${score}%` }} /></div>

      {biggestGap ? (
        <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', marginTop: 'var(--s4)' }}>
          Biggest gap: <strong>{biggestGap.topic}</strong>.
        </p>
      ) : (
        <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ok)', marginTop: 'var(--s4)' }}>
          Your skills touch every focus area in this loop.
        </p>
      )}

      <Link className="btn btn--outline btn--block btn--sm" to="/profile" style={{ marginTop: 'var(--s4)' }}>
        Update your skills
      </Link>
    </div>
  );
}

function OpeningCard({ opening }) {
  const [tone, label] = STATUS[opening.status] || STATUS.rolling;

  return (
    <article className="opening">
      <div>
        <div className="row row--tight" style={{ marginBottom: 'var(--s2)' }}>
          <span className="pill">{opening.kind}</span>
          <span className={`pill pill--${tone} pill--dot`}>{label}</span>
        </div>
        <p className="opening-name">{opening.name}</p>
        <p className="opening-detail">{opening.detail}</p>
      </div>

      <div className="opening-side">
        <div>
          <p className="tick">When</p>
          <p style={{ fontSize: 'var(--t-sm)', marginTop: 3 }}>{opening.window}</p>
        </div>
        <div>
          <p className="tick">Who can apply</p>
          <p style={{ fontSize: 'var(--t-sm)', marginTop: 3, color: 'var(--ink-2)' }}>{opening.eligibility}</p>
        </div>
      </div>
    </article>
  );
}

function HiringRoute({ entry, company, open }) {
  return (
    <>
      <div className="card">
        <div className="co-hero">
          <span className="mark mark--lg" aria-hidden="true"
                style={{ background: company.brandBg, color: company.brandFg }}>
            {company.initial}
          </span>

          <div style={{ minWidth: 0, flex: '1 1 260px' }}>
            <h2 style={{ fontSize: 'var(--t-xl)' }}>Getting into {company.name}</h2>
            <p className="tick" style={{ marginTop: 'var(--s2)' }}>
              {entry.loopWeeks} weeks · {entry.stages.length} stages · {plural(open.length, 'open role')}
            </p>
          </div>
        </div>

        <p style={{ marginTop: 'var(--s6)', color: 'var(--ink-2)', fontSize: 'var(--t-sm)', lineHeight: 1.6 }}>
          {entry.route}
        </p>
      </div>

      {/* The loop is a real sequence, so it earns its numbering. */}
      <section className="card" style={{ marginTop: 'var(--s4)' }} aria-labelledby="loop-title">
        <h2 id="loop-title" style={{ fontSize: 'var(--t-lg)', marginBottom: 'var(--s5)' }}>The loop, stage by stage</h2>

        <ol className="steps">
          {entry.stages.map((stage) => (
            <li key={stage.name} className="step">
              <div className="step-body">
                <div className="row row--split" style={{ alignItems: 'baseline' }}>
                  <p className="step-title">{stage.name}</p>
                  <span className="tick">{stage.typical}</span>
                </div>
                <p className="step-detail">{stage.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="card" style={{ marginTop: 'var(--s4)' }} aria-labelledby="focus-title">
        <h2 id="focus-title" style={{ fontSize: 'var(--t-lg)' }}>What the loop weights</h2>
        <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', margin: 'var(--s2) 0 var(--s5)' }}>
          Heavier bars decide more of the outcome. Prepare from the top down.
        </p>

        <div className="stack">
          {entry.focus.map((area) => (
            <div key={area.topic} className="focus-row">
              <div className="focus-row-head">
                <span className="focus-row-topic">{area.topic}</span>
                <span className="figure" style={{ fontSize: 'var(--t-xs)' }}>{area.weight}</span>
              </div>
              <div className="meter"><div className="meter-fill" style={{ '--v': `${area.weight}%` }} /></div>
              <p className="focus-row-note">{area.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card" style={{ marginTop: 'var(--s4)' }} aria-labelledby="signals-title">
        <h2 id="signals-title" style={{ fontSize: 'var(--t-lg)', marginBottom: 'var(--s4)' }}>
          What makes an application stand out
        </h2>
        <ul className="bullets">
          {entry.signals.map((signal) => <li key={signal}>{signal}</li>)}
        </ul>
      </section>

      <section style={{ marginTop: 'var(--s8)' }} aria-labelledby="intake-title">
        <div className="sec-head">
          <div>
            <h2 id="intake-title">Intakes and assessments</h2>
            <p>Internships, programmes and tests {company.name} runs.</p>
          </div>
        </div>

        <div className="stack">
          {entry.openings.map((opening) => <OpeningCard key={opening.name} opening={opening} />)}
        </div>
      </section>

      <section className="card" style={{ marginTop: 'var(--s8)' }} aria-labelledby="prepare-title">
        <h2 id="prepare-title" style={{ fontSize: 'var(--t-lg)', marginBottom: 'var(--s5)' }}>How to prepare</h2>

        <ol className="steps">
          {entry.prepare.map((item) => (
            <li key={item.label} className="step">
              <div className="step-body">
                <p className="step-title">{item.label}</p>
                <p className="step-detail">{item.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

function Rail({ entry, company, open, harder, user, profile }) {
  const bandNote = open.length
    ? `${money(Math.min(...open.map((j) => j.salaryMin)))} – ${money(Math.max(...open.map((j) => j.salaryMax)))}`
    : '—';

  const openIntakes = entry.openings.filter((o) => o.status === 'open').length;

  return (
    <div className="rail-sticky stack">
      <div className="card">
        <p className="tick">Hiring bar</p>
        <div className="row row--split" style={{ margin: 'var(--s3) 0 5px', alignItems: 'baseline' }}>
          <span style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)' }}>
            {harder === 0 ? 'The highest bar here' : `${harder} ${harder === 1 ? 'company is' : 'companies are'} harder`}
          </span>
          <span className="figure">{entry.bar}/100</span>
        </div>
        <div className="meter meter--lg"><div className="meter-fill" style={{ '--v': `${entry.bar}%` }} /></div>

        <dl className="co-facts" style={{ marginTop: 'var(--s5)', gridTemplateColumns: 'repeat(2,1fr)' }}>
          <div className="co-fact"><dt className="tick">Loop</dt><dd className="co-fact-value">{entry.loopWeeks} wks</dd></div>
          <div className="co-fact"><dt className="tick">Stages</dt><dd className="co-fact-value">{entry.stages.length}</dd></div>
          <div className="co-fact"><dt className="tick">Open intakes</dt><dd className="co-fact-value">{openIntakes}</dd></div>
          <div className="co-fact"><dt className="tick">Pay band</dt><dd className="co-fact-value">{bandNote}</dd></div>
        </dl>
      </div>

      <ReadinessCard entry={entry} user={user} profile={profile} />

      <div className="card">
        <p className="tick">At {company.name}</p>
        <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', margin: 'var(--s3) 0 var(--s4)' }}>{company.tagline || ''}</p>
        <div className="stack-2">
          <Link className="btn btn--primary btn--block btn--sm" to={link('/jobs', { company: company.id })}>
            {plural(open.length, 'open role')}
          </Link>
          <Link className="btn btn--outline btn--block btn--sm" to={`/companies/${company.id}`}>
            Company profile
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Page */

export default function Prep() {
  const { status, error, reload, jobs, companies, prep } = useBoard();
  const { user } = useAuth();
  const profile = useProfile(user?.id);
  const [params, setParams] = useSearchParams();
  const mainRef = useRef(null);

  const ready = status === 'ready';
  const ordered = [...prep].sort((a, b) => b.bar - a.bar);
  const entry = ready ? (prepFor(prep, params.get('company')) || ordered[0]) : undefined;
  const company = entry && companies.find((c) => c.id === entry.companyId);

  usePageMeta(
    company ? `How to get into ${company.name} — Nexjob` : 'How to get in — Nexjob',
    'The interview loop, focus areas, internships and assessments for each company hiring on Nexjob.'
  );

  const choose = (companyId) => {
    setParams({ company: companyId });
    window.scrollTo({ top: (mainRef.current?.offsetTop ?? 0) - 120, behavior: 'smooth' });
  };

  const open = company ? jobsAtCompany(jobs, company.id) : [];
  const harder = entry ? prep.filter((p) => p.bar > entry.bar).length : 0;

  return (
    <>
      <section className="strip strip--tight">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h1>How to get in</h1>
              <p style={{ maxWidth: '62ch' }}>
                What each company's hiring loop actually looks like, what the rounds weight,
                and which internships and assessments they run. Pick a company.
              </p>
            </div>
          </div>

          <div className="callout callout--flag" style={{ marginBottom: 'var(--s6)' }}>
            <div>
              <strong>Sample data.</strong> This is a coursework project, so the routes below are
              written from how these processes are generally known to work, and the intake
              windows are illustrative rather than a calendar. Always check a company's own
              careers page before relying on a date.
            </div>
          </div>

          <div className="prep-picker" id="prep-picker" role="group" aria-label="Choose a company">
            {ready && ordered.map((item) => {
              const co = companies.find((c) => c.id === item.companyId);
              if (!co) return null;

              return (
                <button key={item.companyId} type="button" className="prep-pick"
                        aria-pressed={item.companyId === entry?.companyId}
                        onClick={() => choose(item.companyId)}>
                  <span className="mark mark--sm" aria-hidden="true" style={{ background: co.brandBg, color: co.brandFg }}>
                    {co.initial}
                  </span>
                  {co.name}
                  <span className="tick">{item.bar}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="strip" style={{ paddingTop: 'var(--s5)' }}>
        <div className="wrap split split--rail-right">
          <div id="prep-main" ref={mainRef}>
            {status === 'loading' && <div className="skeleton" style={{ height: 280 }} />}
            {status === 'error' && <LoadError title="The routes did not load" error={error} onRetry={reload} />}
            {entry && company && <HiringRoute entry={entry} company={company} open={open} />}
          </div>

          <aside id="prep-rail" aria-label="Summary">
            {entry && company && (
              <Rail entry={entry} company={company} open={open} harder={harder} user={user} profile={profile} />
            )}
          </aside>
        </div>
      </section>
    </>
  );
}
