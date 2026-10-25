/**
 * The pay explorer.
 *
 * The scale at full volume. One grouping control, one set of rows, one
 * domain — and a field where you can drop your own number onto the same
 * ruler and read the percentile off it.
 */

import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBoard } from '../context/BoardContext.jsx';
import { money, moneyFull, median, percentileOf, posOn, plural } from '../lib/format.js';
import { link } from '../lib/url.js';
import { usePageMeta } from '../hooks/usePageMeta.js';
import { PayScaleRow, PayAxis } from '../components/PayScale.jsx';
import { LoadError } from '../components/LoadError.jsx';

const GROUPS = [
  { id: 'discipline', label: 'Discipline', of: (job) => job.discipline },
  { id: 'level',      label: 'Level',      of: (job) => job.level },
  { id: 'location',   label: 'Location',   of: (job) => (job.remote ? 'Remote' : job.location) },
  { id: 'company',    label: 'Company',    of: (job) => job.companyName },
  { id: 'type',       label: 'Contract',   of: (job) => job.type }
];

/* Level has a natural order; everything else sorts by pay. */
const LEVEL_ORDER = ['Junior', 'Mid', 'Senior', 'Staff', 'Principal'];

const groupRows = (jobs, groupId) => {
  const group = GROUPS.find((g) => g.id === groupId);
  const buckets = new Map();

  jobs.forEach((job) => {
    const key = group.of(job);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(job);
  });

  const rows = [...buckets.entries()].map(([label, set]) => ({
    label,
    count: set.length,
    min: Math.min(...set.map((j) => j.salaryMin)),
    max: Math.max(...set.map((j) => j.salaryMax)),
    mid: median(set.map((j) => j.salaryMid))
  }));

  return groupId === 'level'
    ? rows.sort((a, b) => LEVEL_ORDER.indexOf(a.label) - LEVEL_ORDER.indexOf(b.label))
    : rows.sort((a, b) => b.mid - a.mid);
};

/* --------------------------------------------------- Check your number */

function Verdict({ value, jobs, domain }) {
  const mids = jobs.map((j) => j.salaryMid);
  const pct = percentileOf(value, mids);
  const above = jobs.filter((j) => j.salaryMid > value).length;
  const inBand = jobs.filter((j) => value >= j.salaryMin && value <= j.salaryMax);
  const boardMid = median(mids);

  const verdict = pct >= 75 ? 'near the top of this board'
    : pct >= 50 ? 'above the middle of this board'
    : pct >= 25 ? 'below the middle of this board'
    : 'at the lower end of this board';

  return (
    <div className="pay-verdict" id="pay-result">
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
          <dd className="co-fact-value">{above} of {jobs.length}</dd>
        </div>
        <div className="co-fact">
          <dt className="tick">Bands you fall inside</dt>
          <dd className="co-fact-value">{inBand.length}</dd>
        </div>
        <div className="co-fact">
          <dt className="tick">Board midpoint</dt>
          <dd className="co-fact-value">{money(boardMid)}</dd>
        </div>
        <div className="co-fact">
          <dt className="tick">Difference</dt>
          <dd className="co-fact-value" style={{ color: value >= boardMid ? 'var(--ok)' : 'var(--warn)' }}>
            {value >= boardMid ? '+' : '−'}{money(Math.abs(value - boardMid))}
          </dd>
        </div>
      </dl>

      {inBand.length > 0 && (
        <p style={{ marginTop: 'var(--s5)', fontSize: 'var(--t-sm)', color: 'var(--ink-2)' }}>
          {plural(inBand.length, 'open role')} advertise a band that includes your number.{' '}
          <Link to={link('/jobs', { payMin: Math.max(domain.min, value - 10000) })}>See them</Link>.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- Page */

export default function Salaries() {
  usePageMeta(
    'Pay explorer — Nexjob',
    'Compare pay across disciplines, levels and locations on one shared scale, and check where your own number sits.'
  );

  const { status, error, reload, jobs, domain } = useBoard();
  const ready = status === 'ready';

  const [group, setGroup] = useState('discipline');
  const [input, setInput] = useState('');
  const [checked, setChecked] = useState(null);   /* the number last placed on the scale */
  const inputRef = useRef(null);

  const rows = ready ? groupRows(jobs, group) : [];

  const mids = jobs.map((j) => j.salaryMid).sort((a, b) => a - b);
  const p25 = mids[Math.floor(mids.length * 0.25)];
  const p75 = mids[Math.floor(mids.length * 0.75)];

  const stats = ready ? [
    ['Lowest floor', money(Math.min(...jobs.map((j) => j.salaryMin))), 'advertised'],
    ['25th percentile', money(p25), 'of midpoints'],
    ['Median midpoint', money(median(mids)), 'across the board'],
    ['75th percentile', money(p75), 'of midpoints']
  ] : [];

  const onCheck = (event) => {
    event.preventDefault();
    const value = Number(input);

    if (!Number.isFinite(value) || value <= 0) {
      setChecked(null);
      inputRef.current?.focus();
      return;
    }

    setChecked(value);
  };

  return (
    <>
      <section className="strip strip--tight">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h1>What the market pays</h1>
              <p id="pay-lede">
                {ready
                  ? `${plural(jobs.length, 'open role')}, ${money(domain.min)} to ${money(domain.max)}, all on one domain.`
                  : 'Loading…'}
              </p>
            </div>
            <Link className="btn btn--outline btn--sm" to="/jobs">Browse the roles behind these figures</Link>
          </div>

          <div className="stats" id="pay-stats">
            {stats.map(([label, figure, note]) => (
              <div key={label} className="stat">
                <span className="tick">{label}</span>
                <span className="stat-figure">{figure}</span>
                <span className="tick" style={{ textTransform: 'none', letterSpacing: 0 }}>{note}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The signature at full volume: your own number, placed on the board. */}
      <section className="strip" style={{ paddingTop: 0 }} aria-labelledby="check-title">
        <div className="wrap">
          <div className="card">
            <h2 id="check-title" style={{ fontSize: 'var(--t-lg)' }}>Where does your number sit?</h2>
            <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', margin: 'var(--s3) 0 var(--s5)', maxWidth: '60ch' }}>
              Type a base salary and it gets drawn on the same scale as every role on the
              board, with the percentile underneath. Nothing is sent anywhere — the number
              never leaves this page.
            </p>

            <form className="pay-check" id="pay-check" onSubmit={onCheck}>
              <div className="field">
                <label htmlFor="pay-input">Your base salary, USD per year</label>
                <input className="input" type="number" id="pay-input" min="0" max="1000000" step="1000"
                       placeholder="150000" inputMode="numeric" ref={inputRef} value={input}
                       onChange={(event) => setInput(event.target.value)} />
              </div>
              <button className="btn btn--primary" type="submit" disabled={!ready}>Place it on the scale</button>
            </form>

            {ready && checked !== null && <Verdict value={checked} jobs={jobs} domain={domain} />}
          </div>
        </div>
      </section>

      <section className="strip strip--panel" aria-labelledby="breakdown-title">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h2 id="breakdown-title">Break it down</h2>
              <p id="group-note">
                {!ready ? 'Every group drawn on one domain, sorted by midpoint.'
                  : group === 'level'
                    ? `${plural(rows.length, 'level')}, in order of seniority.`
                    : `${plural(rows.length, 'group')}, sorted by midpoint.`}
              </p>
            </div>

            <div className="seg" id="group-seg" role="group" aria-label="Group pay by">
              {GROUPS.map((g) => (
                <button key={g.id} type="button" aria-pressed={g.id === group} onClick={() => setGroup(g.id)}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="stack" id="pay-rows">
            {status === 'error' && <LoadError title="The pay data did not load" error={error} onRetry={reload} />}
            {rows.map((row) => <PayScaleRow key={row.label} row={row} domain={domain} />)}
          </div>
          <div id="pay-rows-axis" style={{ marginTop: 'var(--s4)' }}>{ready && <PayAxis domain={domain} />}</div>

          <p className="tick" style={{ marginTop: 'var(--s5)', textTransform: 'none', letterSpacing: 0, color: 'var(--ink-3)' }}>
            Bands are the advertised floor and ceiling. The tick inside each band is the
            median midpoint for that group. Sample data, USD, base salary only.
          </p>
        </div>
      </section>
    </>
  );
}
