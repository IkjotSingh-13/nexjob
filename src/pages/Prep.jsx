/**
 * How to get in: each company's interview loop, what it weights, its intakes,
 * and how ready your profile looks for it.
 */

import { useContext, useEffect, useRef, useState } from 'react';
import { useBoardData } from '../lib/hooks.js';
import { prepFor, jobsAtCompany, readinessFor, payRange } from '../lib/data.js';
import { money, plural } from '../lib/format.js';
import { getParam, pushAddress } from '../lib/url.js';
import { getProfile, profileCompleteness } from '../lib/store.js';
import { UserContext } from '../lib/UserContext.jsx';
import Mark from '../components/Mark.jsx';
import LoadError from '../components/LoadError.jsx';
import { Link } from 'react-router';

const STATUS = {
  open:     ['ok',   'Open now'],
  rolling:  ['blue', 'Rolling'],
  upcoming: ['warn', 'Upcoming'],
  closed:   ['stop', 'Closed']
};

export default function Prep() {
  const { data, failed } = useBoardData();
  const [companyId, setCompanyId] = useState(getParam('company'));   // from ?company= in the address
  const main = useRef(null);

  /* Back and forward buttons switch company too. An address with no ?company= leaves the page as it is. */
  useEffect(() => {
    const onPopState = () => {
      const fromAddress = getParam('company');
      if (fromAddress) {
        setCompanyId(fromAddress);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  let ordered = [];     // every route, highest hiring bar first
  let entry = null;     // the route on screen
  let company = null;   // and its company
  if (data) {
    ordered = [...data.prep].sort((a, b) => b.bar - a.bar);

    /* An unknown company falls back to the first one. */
    entry = prepFor(data.prep, companyId) || ordered[0];
    if (entry) {
      company = data.companies.find((c) => c.id === entry.companyId);
    }
  }

  useEffect(() => {
    if (company) {
      document.title = `How to get into ${company.name} — Nexjob`;
    }
  }, [company]);

  const pick = (id) => {
    setCompanyId(id);
    pushAddress(`/prep?company=${id}`);   // a new history entry, so Back returns to the last company
    window.scrollTo({ top: main.current.offsetTop - 120, behavior: 'smooth' });
  };

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

          <div className="prep-picker" role="group" aria-label="Choose a company">
            {ordered.map((item) => {
              const c = data.companies.find((x) => x.id === item.companyId);
              return (
                <button type="button" className="prep-pick" key={item.companyId}
                        aria-pressed={item.companyId === entry.companyId} onClick={() => pick(item.companyId)}>
                  <Mark company={c} size="sm" />
                  {c.name}
                  <span className="tick">{item.bar}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="strip" style={{ paddingTop: 'var(--s5)' }}>
        <div className="wrap split split--rail-right">
          <div ref={main}>
            {failed && <LoadError title="The routes did not load" />}
            {!data && !failed && <div className="skeleton" style={{ height: 280 }} />}
            {entry && <Route entry={entry} company={company} jobs={data.jobs} />}
          </div>

          <aside aria-label="Summary">
            {entry && <Summary entry={entry} company={company} data={data} />}
          </aside>
        </div>
      </section>
    </>
  );
}

function Route({ entry, company, jobs }) {
  const open = jobsAtCompany(jobs, company.id);

  return (
    <>
      <div className="card">
        <div className="co-hero">
          <Mark company={company} size="lg" />
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

      <section className="card" style={{ marginTop: 'var(--s4)' }} aria-labelledby="loop-title">
        <h2 id="loop-title" style={{ fontSize: 'var(--t-lg)', marginBottom: 'var(--s5)' }}>The loop, stage by stage</h2>
        <ol className="steps">
          {entry.stages.map((stage, i) => (
            <li className="step" key={i}>
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
          {entry.focus.map((area, i) => (
            <div className="focus-row" key={i}>
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
        <h2 id="signals-title" style={{ fontSize: 'var(--t-lg)', marginBottom: 'var(--s4)' }}>What makes an application stand out</h2>
        <ul className="bullets">{entry.signals.map((signal, i) => <li key={i}>{signal}</li>)}</ul>
      </section>

      <section style={{ marginTop: 'var(--s8)' }} aria-labelledby="intake-title">
        <div className="sec-head">
          <div>
            <h2 id="intake-title">Intakes and assessments</h2>
            <p>Internships, programmes and tests {company.name} runs.</p>
          </div>
        </div>
        <div className="stack">
          {entry.openings.map((opening, i) => <Opening opening={opening} key={i} />)}
        </div>
      </section>

      <section className="card" style={{ marginTop: 'var(--s8)' }} aria-labelledby="prepare-title">
        <h2 id="prepare-title" style={{ fontSize: 'var(--t-lg)', marginBottom: 'var(--s5)' }}>How to prepare</h2>
        <ol className="steps">
          {entry.prepare.map((item, i) => (
            <li className="step" key={i}>
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

function Opening({ opening }) {
  /* The pill's colour and words, e.g. ['ok', 'Open now']. Unknown status: "Rolling". */
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

/** The sidebar: hiring bar, your readiness, and links to the company. */
/** "The highest bar here", "1 company is harder", "3 companies are harder". */
const harderText = (harder) => {
  if (harder === 0) return 'The highest bar here';
  if (harder === 1) return '1 company is harder';
  return `${harder} companies are harder`;
};

function Summary({ entry, company, data }) {
  const open = jobsAtCompany(data.jobs, company.id);
  const { min, max } = payRange(open);
  const openIntakes = entry.openings.filter((opening) => opening.status === 'open').length;
  const harder = data.prep.filter((other) => other.bar > entry.bar).length;   // companies with a higher bar

  return (
    <div className="rail-sticky stack">
      <div className="card">
        <p className="tick">Hiring bar</p>
        <div className="row row--split" style={{ margin: 'var(--s3) 0 5px', alignItems: 'baseline' }}>
          <span style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)' }}>
            {harderText(harder)}
          </span>
          <span className="figure">{entry.bar}/100</span>
        </div>
        <div className="meter meter--lg"><div className="meter-fill" style={{ '--v': `${entry.bar}%` }} /></div>

        <dl className="co-facts" style={{ marginTop: 'var(--s5)', gridTemplateColumns: 'repeat(2,1fr)' }}>
          <div className="co-fact"><dt className="tick">Loop</dt><dd className="co-fact-value">{entry.loopWeeks} wks</dd></div>
          <div className="co-fact"><dt className="tick">Stages</dt><dd className="co-fact-value">{entry.stages.length}</dd></div>
          <div className="co-fact"><dt className="tick">Open intakes</dt><dd className="co-fact-value">{openIntakes}</dd></div>
          <div className="co-fact">
            <dt className="tick">Pay band</dt>
            <dd className="co-fact-value">{open.length ? `${money(min)} – ${money(max)}` : '—'}</dd>
          </div>
        </dl>
      </div>

      <Readiness entry={entry} />

      <div className="card">
        <p className="tick">At {company.name}</p>
        <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', margin: 'var(--s3) 0 var(--s4)' }}>{company.tagline || ''}</p>
        <div className="stack-2">
          <Link className="btn btn--primary btn--block btn--sm" to={`/jobs?company=${company.id}`}>
            {plural(open.length, 'open role')}
          </Link>
          <Link className="btn btn--outline btn--block btn--sm" to={`/company?id=${company.id}`}>
            Company profile
          </Link>
        </div>
      </div>
    </div>
  );
}

/** How many of this loop's focus areas the signed-in user's skills cover. */
function Readiness({ entry }) {
  const { user } = useContext(UserContext);
  const text = { fontSize: 'var(--t-sm)', color: 'var(--ink-2)', margin: 'var(--s3) 0 var(--s4)' };

  if (!user) {
    return (
      <div className="card">
        <p className="tick">Your readiness</p>
        <p style={text}>
          Sign in and add your skills, and this panel scores them against what this
          loop actually weights.
        </p>
        <Link className="btn btn--outline btn--block btn--sm"
           to={`/auth?next=${encodeURIComponent(`/prep?company=${entry.companyId}`)}`}>Sign in</Link>
      </div>
    );
  }

  const profile = getProfile(user.id);

  if (profile.skills.length === 0) {
    return (
      <div className="card">
        <p className="tick">Your readiness</p>
        <p style={text}>
          Add a few skills to your profile and they get matched against the focus areas
          below. Your profile is {profileCompleteness(profile)}% filled in.
        </p>
        <Link className="btn btn--outline btn--block btn--sm" to="/profile">Add your skills</Link>
      </div>
    );
  }

  const { score, covered, gaps } = readinessFor(entry, profile);

  /* The focus area you do not cover that weighs the most (null when you cover them all). */
  let biggestGap = null;
  for (const area of gaps) {
    if (biggestGap === null || area.weight > biggestGap.weight) {
      biggestGap = area;
    }
  }

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
