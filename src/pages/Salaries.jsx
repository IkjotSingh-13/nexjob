/**
 * The pay explorer: pay grouped five ways, and a box to check your own number.
 */

import { useState } from 'react';
import { useBoardData } from '../lib/hooks.js';
import { LEVELS, payRange } from '../lib/data.js';
import { money, moneyFull, median, percentileOf, posOn, plural, unique } from '../lib/format.js';
import { PayScaleRow, PayAxis } from '../components/PayScale.jsx';
import Stats from '../components/Stats.jsx';
import LoadError from '../components/LoadError.jsx';
import { Link } from 'react-router';

const GROUPS = [
  { id: 'discipline', label: 'Discipline', of: (job) => job.discipline },
  { id: 'level',      label: 'Level',      of: (job) => job.level },
  { id: 'location',   label: 'Location',   of: (job) => (job.remote ? 'Remote' : job.location) },
  { id: 'company',    label: 'Company',    of: (job) => job.companyName },
  { id: 'type',       label: 'Contract',   of: (job) => job.type }
];

/** One row per group. Levels keep their natural order; the rest go by pay. */
const groupRows = (jobs, groupId) => {
  const group = GROUPS.find((g) => g.id === groupId);   // e.g. the "Discipline" grouping
  const names = unique(jobs.map(group.of));              // e.g. Engineering, Design ...

  const rows = [];
  for (const name of names) {
    const set = jobs.filter((job) => group.of(job) === name);   // the jobs in this group
    const range = payRange(set);
    rows.push({
      label: name,
      count: set.length,
      min: range.min,
      max: range.max,
      mid: median(set.map((job) => job.salaryMid))
    });
  }

  if (groupId === 'level') {
    rows.sort((a, b) => LEVELS.indexOf(a.label) - LEVELS.indexOf(b.label));   // Junior, Mid, Senior ...
  } else {
    rows.sort((a, b) => b.mid - a.mid);                                      // highest middle pay first
  }
  return rows;
};

export default function Salaries() {
  const { data, failed } = useBoardData();
  const [group, setGroup] = useState('discipline');
  const [yourPay, setYourPay] = useState(null);   // the number that was checked, or null

  const check = (event) => {
    event.preventDefault();
    const input = event.target.elements.pay;
    const value = Number(input.value);

    if (!Number.isFinite(value) || value <= 0) {
      setYourPay(null);
      input.focus();
      return;
    }
    setYourPay(value);
  };

  const rows = data ? groupRows(data.jobs, group) : [];

  return (
    <>
      <section className="strip strip--tight">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h1>What the market pays</h1>
              <p>
                {data
                  ? `${plural(data.jobs.length, 'open role')}, ${money(data.domain.min)} to ${money(data.domain.max)}, all on one domain.`
                  : 'Loading…'}
              </p>
            </div>
            <Link className="btn btn--outline btn--sm" to="/jobs">Browse the roles behind these figures</Link>
          </div>

          <Stats items={data ? payStats(data.jobs) : []} />
        </div>
      </section>

      {/* Your own number, placed on the board's scale. */}
      <section className="strip" style={{ paddingTop: 0 }} aria-labelledby="check-title">
        <div className="wrap">
          <div className="card">
            <h2 id="check-title" style={{ fontSize: 'var(--t-lg)' }}>Where does your number sit?</h2>
            <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', margin: 'var(--s3) 0 var(--s5)', maxWidth: '60ch' }}>
              Type a base salary and it gets drawn on the same scale as every role on the
              board, with the percentile underneath. Nothing is sent anywhere — the number
              never leaves this page.
            </p>

            <form className="pay-check" onSubmit={check}>
              <div className="field">
                <label htmlFor="pay-input">Your base salary, USD per year</label>
                <input className="input" type="number" id="pay-input" name="pay" min="0" max="1000000" step="1000"
                       placeholder="150000" inputMode="numeric" />
              </div>
              <button className="btn btn--primary" type="submit">Place it on the scale</button>
            </form>

            {data && yourPay !== null && <Verdict value={yourPay} jobs={data.jobs} domain={data.domain} />}
          </div>
        </div>
      </section>

      <section className="strip strip--panel" aria-labelledby="breakdown-title">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h2 id="breakdown-title">Break it down</h2>
              <p>
                {!data && 'Every group drawn on one domain, sorted by midpoint.'}
                {data && group === 'level' && `${plural(rows.length, 'level')}, in order of seniority.`}
                {data && group !== 'level' && `${plural(rows.length, 'group')}, sorted by midpoint.`}
              </p>
            </div>

            <div className="seg" role="group" aria-label="Group pay by">
              {data && GROUPS.map((g) => (
                <button type="button" key={g.id} aria-pressed={g.id === group} onClick={() => setGroup(g.id)}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="stack">
            {failed && <LoadError title="The pay data did not load" />}
            {rows.map((row) => <PayScaleRow key={row.label} row={row} domain={data.domain} />)}
          </div>
          <div style={{ marginTop: 'var(--s4)' }}>{data && <PayAxis domain={data.domain} />}</div>

          <p className="tick" style={{ marginTop: 'var(--s5)', textTransform: 'none', letterSpacing: 0, color: 'var(--ink-3)' }}>
            Bands are the advertised floor and ceiling. The tick inside each band is the
            median midpoint for that group. Sample data, USD, base salary only.
          </p>
        </div>
      </section>
    </>
  );
}

/** The four figures at the top: [label, figure, note] each. */
const payStats = (jobs) => {
  const mids = jobs.map((job) => job.salaryMid);
  const sorted = [...mids].sort((a, b) => a - b);   // a copy, small to big

  /* The 25th percentile is the value a quarter of the way up the sorted list. */
  const quarterUp = sorted[Math.floor(sorted.length * 0.25)];
  const threeQuartersUp = sorted[Math.floor(sorted.length * 0.75)];

  return [
    ['Lowest floor', money(payRange(jobs).min), 'advertised'],
    ['25th percentile', money(quarterUp), 'of midpoints'],
    ['Median midpoint', money(median(mids)), 'across the board'],
    ['75th percentile', money(threeQuartersUp), 'of midpoints']
  ];
};

/** Where your number sits among every role on the board. */
function Verdict({ value, jobs, domain }) {
  const mids = jobs.map((j) => j.salaryMid);
  const pct = percentileOf(value, mids);
  const payingMore = jobs.filter((j) => j.salaryMid > value).length;
  const inBand = jobs.filter((j) => value >= j.salaryMin && value <= j.salaryMax).length;
  const boardMid = median(mids);
  const above = value >= boardMid;

  let verdict = 'at the lower end of this board';
  if (pct >= 75) verdict = 'near the top of this board';
  else if (pct >= 50) verdict = 'above the middle of this board';
  else if (pct >= 25) verdict = 'below the middle of this board';

  return (
    <div className="pay-verdict">
      <div className="row row--split" style={{ alignItems: 'baseline', marginBottom: 'var(--s4)' }}>
        <div>
          <p className="tick">Your number sits at</p>
          <p className="pay-verdict-figure">{pct}<span style={{ fontSize: '.45em' }}>th pct</span></p>
        </div>
        <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', maxWidth: '38ch', textAlign: 'right' }}>
          {moneyFull(value)} is {verdict}.
        </p>
      </div>

      <div className="scale scale--xl" role="img"
           aria-label={`${moneyFull(value)} sits at the ${pct}th percentile of ${jobs.length} open roles`}
           style={{ '--lo': '0%', '--hi': '100%', '--mark': `${posOn(value, domain).toFixed(2)}%` }}>
        <div className="scale-track" />
        <div className="scale-band scale--muted" style={{ background: 'var(--blue-line)' }} />
        <div className="scale-mark" />
      </div>
      <PayAxis domain={domain} />

      <dl className="co-facts" style={{ marginTop: 'var(--s6)' }}>
        <div className="co-fact">
          <dt className="tick">Roles paying more</dt>
          <dd className="co-fact-value">{payingMore} of {jobs.length}</dd>
        </div>
        <div className="co-fact">
          <dt className="tick">Bands you fall inside</dt>
          <dd className="co-fact-value">{inBand}</dd>
        </div>
        <div className="co-fact">
          <dt className="tick">Board midpoint</dt>
          <dd className="co-fact-value">{money(boardMid)}</dd>
        </div>
        <div className="co-fact">
          <dt className="tick">Difference</dt>
          <dd className="co-fact-value" style={{ color: above ? 'var(--ok)' : 'var(--warn)' }}>
            {above ? '+' : '−'}{money(Math.abs(value - boardMid))}
          </dd>
        </div>
      </dl>

      {inBand > 0 && (
        <p style={{ marginTop: 'var(--s5)', fontSize: 'var(--t-sm)', color: 'var(--ink-2)' }}>
          {plural(inBand, 'open role')} advertise a band that includes your number.{' '}
          <Link to={`/jobs?payMin=${Math.max(domain.min, value - 10000)}`}>See them</Link>.
        </p>
      )}
    </div>
  );
}
