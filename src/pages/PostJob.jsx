/**
 * Post a role, in three steps, with a live preview. The salary band is
 * required: a role without one cannot be drawn on the scale.
 */

import { useContext, useState } from 'react';
import { useNavigate } from 'react-router';
import { useBoardData } from '../lib/hooks.js';
import { facets, companyById, LEVELS } from '../lib/data.js';
import { money } from '../lib/format.js';
import { createJob } from '../lib/api.js';
import { UserContext } from '../lib/UserContext.jsx';
import { toast } from '../lib/toast.js';
import JobCard from '../components/JobCard.jsx';
import { PayScale, PayAxis } from '../components/PayScale.jsx';

const STEPS = ['The role', 'Pay and detail', 'Review'];
const CONTRACTS = ['Full-time', 'Part-time', 'Contract', 'Internship'];

const EMPTY_FORM = {
  title: '', discipline: '', level: 'Mid', type: 'Full-time', location: '', remote: false,
  min: '', max: '', summary: '', tags: '', responsibilities: '', requirements: ''
};

/**
 * Split text into a list, trim each part, and leave out the empty ones.
 * splitAndTrim("React, , Go ", ",") -> ["React", "Go"]
 */
const splitAndTrim = (text, separator) => {
  const result = [];
  for (const part of text.split(separator)) {
    const trimmed = part.trim();
    if (trimmed !== '') {
      result.push(trimmed);
    }
  }
  return result;
};

/** "one\n two \n\n" -> ["one", "two"]: one item per line. */
const lines = (text) => splitAndTrim(text, '\n');

/* Only employers get here: main.jsx wraps this page in <RequireRole role="employer">. */
export default function PostJob() {
  const { user } = useContext(UserContext);
  return <PostJobForm user={user} />;
}

function PostJobForm({ user }) {
  const navigate = useNavigate();
  const { data, failed } = useBoardData();
  const [form, setForm] = useState(EMPTY_FORM);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);   // waiting for the backend to save the role

  /* change('title', 'Designer') -> a copy of the form with the new title. */
  const change = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const disciplines = data ? facets(data.jobs).disciplines : [];

  /* The employer's company. If it is not found, a stand-in so the preview can still be drawn. */
  let company = null;
  if (data) {
    company = companyById(data.companies, user.companyId);
  }
  if (!company) {
    company = { id: user.companyId || 'unknown', name: 'Your company', initial: '?', brandBg: '#2B36C4', brandFg: '#FFFFFF' };
  }

  /* The role as it will be saved. Empty fields get a placeholder ("a || b" uses b when a is empty). */
  const posting = {
    title: form.title.trim() || 'Untitled role',
    companyId: company.id,
    companyName: company.name,
    discipline: form.discipline || disciplines[0] || '',   // what was picked, or the first one in the list
    level: form.level,
    type: form.type,
    location: form.location.trim() || 'Location not set',
    remote: form.remote,
    salaryMin: Number(form.min) || 0,
    salaryMax: Number(form.max) || 0,
    summary: form.summary.trim() || 'No summary yet.',
    tags: splitAndTrim(form.tags, ','),
    responsibilities: lines(form.responsibilities),
    requirements: lines(form.requirements),
    featured: false,
    postedHoursAgo: 0
  };

  /* What is wrong with a step, as [message, id of the field to fix], or null. */
  const problemIn = (n) => {
    if (n === 1) {
      if (!form.title.trim()) return ['Give the role a title.', 'j-title'];
      if (!form.location.trim()) return ['Say where the role is based.', 'j-location'];
    }
    if (n === 2) {
      if (!posting.salaryMin || !posting.salaryMax) return ['Both ends of the salary band are required.', 'j-min'];
      if (posting.salaryMax < posting.salaryMin) return ['The ceiling has to be at or above the floor.', 'j-max'];
      if (!form.summary.trim()) return ['Write a one-line summary.', 'j-summary'];
    }
    return null;
  };

  /* Show the problem (if any) and put the cursor in that field. */
  const validate = (n) => {
    const problem = problemIn(n);

    if (problem) {
      setError(problem[0]);                            // the message
      document.getElementById(problem[1]).focus();     // the field to fix
      return false;
    }

    setError('');
    return true;
  };

  const next = () => {
    if (!validate(step)) return;
    setStep(Math.min(STEPS.length, step + 1));   // one step on, but not past the last step
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const publish = (event) => {
    event.preventDefault();
    if (!validate(1)) return setStep(1);
    if (!validate(2)) return setStep(2);

    setBusy(true);

    createJob({ ...posting, postedBy: user.id })   // saves it in MySQL, returns a Promise
      .then((saved) => {
        toast('Role published', 'ok');
        navigate(`/job?id=${saved.id}`);
      })
      .catch(() => setError('The role could not be saved. Start the backend (uvicorn main:app) and try again.'))
      .finally(() => setBusy(false));
  };

  const preview = { ...posting, id: 'preview', company, postedAt: new Date() };
  const hasBand = posting.salaryMin > 0 && posting.salaryMax > 0;

  return (
    <section className="strip strip--tight">
      <div className="wrap split split--rail-right">

        <div>
          <p className="tick tick--flag">For employers</p>
          <h1 style={{ marginTop: 'var(--s3)' }}>Post a role</h1>
          <p style={{ marginTop: 'var(--s2)', color: 'var(--ink-2)', maxWidth: '54ch' }}>
            Three steps. The salary band is required — a listing without one cannot be
            drawn on the scale, and those are the listings people skip.
          </p>

          <div className="wizard-steps" style={{ marginTop: 'var(--s7)' }}>
            {STEPS.map((label, i) => {
              const n = i + 1;
              const state = n < step ? 'is-done' : n === step ? 'is-now' : '';
              return (
                <div className={`wizard-step ${state}`} key={label}>
                  <span className="wizard-step-bar" />
                  <span className="tick">{String(n).padStart(2, '0')} {label}</span>
                </div>
              );
            })}
          </div>

          <p className="form-error" role="alert" hidden={!error}>{error}</p>

          <form onSubmit={publish}>

            {/* Step 1 */}
            <fieldset style={{ border: 0, padding: 0, margin: 0 }} hidden={step !== 1}>
              <div className="card stack">
                <legend className="visually-hidden">The role</legend>

                <div className="field">
                  <label htmlFor="j-title">Role title</label>
                  <input className="input" type="text" id="j-title" required placeholder="Senior Frontend Engineer"
                         value={form.title} onChange={(e) => change('title', e.target.value)} />
                  <span className="field-note">The title people will search for, not an internal grade.</span>
                </div>

                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="j-discipline">Discipline</label>
                    <span className="select-wrap">
                      <select className="select" id="j-discipline" value={posting.discipline}
                              onChange={(e) => change('discipline', e.target.value)}>
                        {disciplines.map((d) => <option key={d}>{d}</option>)}
                      </select>
                    </span>
                  </div>

                  <div className="field">
                    <label htmlFor="j-level">Level</label>
                    <span className="select-wrap">
                      <select className="select" id="j-level" value={form.level} onChange={(e) => change('level', e.target.value)}>
                        {LEVELS.map((level) => <option key={level}>{level}</option>)}
                      </select>
                    </span>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="j-type">Contract</label>
                    <span className="select-wrap">
                      <select className="select" id="j-type" value={form.type} onChange={(e) => change('type', e.target.value)}>
                        {CONTRACTS.map((type) => <option key={type}>{type}</option>)}
                      </select>
                    </span>
                  </div>

                  <div className="field">
                    <label htmlFor="j-location">Location</label>
                    <input className="input" type="text" id="j-location" required placeholder="London, UK"
                           value={form.location} onChange={(e) => change('location', e.target.value)} />
                  </div>
                </div>

                <label className="check">
                  <input type="checkbox" checked={form.remote} onChange={(e) => change('remote', e.target.checked)} />
                  <span>This role can be done remotely</span>
                </label>
              </div>
            </fieldset>

            {/* Step 2 */}
            <fieldset style={{ border: 0, padding: 0, margin: 0 }} hidden={step !== 2}>
              <div className="card stack">
                <legend className="visually-hidden">Pay and detail</legend>

                <div>
                  <p className="field-label" style={{ marginBottom: 'var(--s3)' }}>Salary band, USD per year</p>

                  <div className="grid-2">
                    <div className="field">
                      <label htmlFor="j-min">Floor</label>
                      <input className="input" type="number" id="j-min" required min="20000" max="600000" step="1000"
                             placeholder="140000" inputMode="numeric"
                             value={form.min} onChange={(e) => change('min', e.target.value)} />
                    </div>
                    <div className="field">
                      <label htmlFor="j-max">Ceiling</label>
                      <input className="input" type="number" id="j-max" required min="20000" max="600000" step="1000"
                             placeholder="180000" inputMode="numeric"
                             value={form.max} onChange={(e) => change('max', e.target.value)} />
                    </div>
                  </div>

                  <div style={{ marginTop: 'var(--s4)' }}>
                    {data && hasBand && posting.salaryMax >= posting.salaryMin && (
                      <>
                        <div className="row row--split" style={{ marginBottom: 6 }}>
                          <span className="tick">On the board's scale</span>
                          <span className="figure" style={{ fontSize: 'var(--t-xs)' }}>
                            {money(posting.salaryMin)} – {money(posting.salaryMax)}
                          </span>
                        </div>
                        <PayScale min={posting.salaryMin} max={posting.salaryMax} domain={data.domain} size="lg" />
                        <PayAxis domain={data.domain} />
                      </>
                    )}
                    {data && !(hasBand && posting.salaryMax >= posting.salaryMin) && (
                      <p className="field-note">Set both ends of the band to see it on the scale.</p>
                    )}
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="j-summary">One-line summary</label>
                  <textarea className="textarea" id="j-summary" rows="2" required placeholder="What the person will actually work on."
                            value={form.summary} onChange={(e) => change('summary', e.target.value)} />
                </div>

                <div className="field">
                  <label htmlFor="j-tags">Skills</label>
                  <input className="input" type="text" id="j-tags" placeholder="React, TypeScript, Accessibility"
                         value={form.tags} onChange={(e) => change('tags', e.target.value)} />
                  <span className="field-note">Separate with commas. These are what candidate profiles match against.</span>
                </div>

                <div className="field">
                  <label htmlFor="j-resp">What they will do</label>
                  <textarea className="textarea" id="j-resp" rows="4" placeholder="One per line."
                            value={form.responsibilities} onChange={(e) => change('responsibilities', e.target.value)} />
                  <span className="field-note">One per line.</span>
                </div>

                <div className="field">
                  <label htmlFor="j-req">What you are looking for</label>
                  <textarea className="textarea" id="j-req" rows="4" placeholder="One per line."
                            value={form.requirements} onChange={(e) => change('requirements', e.target.value)} />
                  <span className="field-note">One per line.</span>
                </div>
              </div>
            </fieldset>

            {/* Step 3 */}
            <fieldset style={{ border: 0, padding: 0, margin: 0 }} hidden={step !== 3}>
              <legend className="visually-hidden">Review</legend>
              <Review posting={posting} />
            </fieldset>

            <div className="row row--split" style={{ marginTop: 'var(--s6)' }}>
              <button type="button" className="btn btn--outline" hidden={step === 1}
                      onClick={() => setStep(Math.max(1, step - 1))}>Back</button>
              <div className="row row--tight" style={{ marginLeft: 'auto' }}>
                <button type="button" className="btn btn--primary" hidden={step === STEPS.length} onClick={next}>Continue</button>
                <button type="submit" className="btn btn--primary" hidden={step !== STEPS.length} disabled={busy}>
                  {busy ? 'Publishing…' : 'Publish role'}
                </button>
              </div>
            </div>
          </form>
        </div>

        <aside aria-label="Live preview">
          <div className="preview-sticky">
            <p className="tick" style={{ marginBottom: 'var(--s3)' }}>How it will look on the board</p>
            <div>
              {failed && (
                <div className="card">
                  <p className="tick">Preview unavailable</p>
                  <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', marginTop: 'var(--s3)' }}>
                    The board data did not load, so the scale cannot be drawn. Start the app
                    with npm run dev and reload.
                  </p>
                </div>
              )}
              {data && hasBand && <JobCard job={preview} domain={data.domain} />}
              {data && !hasBand && (
                <div className="card" style={{ borderStyle: 'dashed' }}>
                  <p className="tick">Waiting on a salary band</p>
                  <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', marginTop: 'var(--s3)' }}>
                    Once you set a floor and a ceiling, the card appears here exactly as it will on
                    the board.
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Review({ posting }) {
  const facts = [
    ['Title', posting.title],
    ['Company', posting.companyName],
    ['Discipline', posting.discipline],
    ['Level', posting.level],
    ['Contract', posting.type],
    ['Location', `${posting.location}${posting.remote ? ' · remote' : ''}`],
    ['Band', `${money(posting.salaryMin)} – ${money(posting.salaryMax)}`],
    ['Skills', posting.tags.length || 'none']
  ];

  return (
    <div className="card stack">
      <h2 style={{ fontSize: 'var(--t-lg)' }}>Check it over</h2>

      <dl className="co-facts" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        {facts.map(([label, value]) => (
          <div className="co-fact" key={label}><dt className="tick">{label}</dt><dd className="co-fact-value">{value}</dd></div>
        ))}
      </dl>

      <div>
        <p className="tick" style={{ marginBottom: 'var(--s2)' }}>Summary</p>
        <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)' }}>{posting.summary}</p>
      </div>

      {posting.responsibilities.length > 0 && (
        <div>
          <p className="tick" style={{ marginBottom: 'var(--s3)' }}>What they will do</p>
          <ul className="bullets">{posting.responsibilities.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </div>
      )}

      {posting.requirements.length > 0 && (
        <div>
          <p className="tick" style={{ marginBottom: 'var(--s3)' }}>What you are looking for</p>
          <ul className="bullets">{posting.requirements.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
