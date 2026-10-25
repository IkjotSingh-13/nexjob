/**
 * Post a role.
 *
 * Three steps with a live preview, and a required salary band. Asking for the
 * band up front is the whole product argument: a listing that cannot be drawn
 * on the scale is a listing people scroll past.
 *
 * Every field lives in one `form` object. The preview card, the band preview
 * and the review step are all derived from it, so there is nothing to keep in
 * step by hand.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBoard } from '../context/BoardContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { companyById, facets } from '../lib/jobs.js';
import { money } from '../lib/format.js';
import * as api from '../services/api.js';
import { useAction } from '../hooks/useAction.js';
import { usePageMeta } from '../hooks/usePageMeta.js';
import { JobCard, Skeletons } from '../components/JobCard.jsx';
import { PayScale, PayAxis } from '../components/PayScale.jsx';

const STEPS = ['The role', 'Pay and detail', 'Review'];

const LEVELS = ['Junior', 'Mid', 'Senior', 'Staff', 'Principal'];
const CONTRACTS = ['Full-time', 'Part-time', 'Contract', 'Internship'];

const BLANK = {
  title: '', discipline: '', level: 'Mid', type: 'Full-time', location: '', remote: false,
  min: '', max: '', summary: '', tags: '', resp: '', req: ''
};

const lines = (value) => value.split('\n').map((line) => line.trim()).filter(Boolean);

/* ---------------------------------------------------------- Validation */

/** @returns {{message: string, field: string} | null} the first thing wrong with a step */
const check = (form, step) => {
  if (step === 1) {
    if (!form.title.trim()) return { message: 'Give the role a title.', field: 'j-title' };
    if (!form.location.trim()) return { message: 'Say where the role is based.', field: 'j-location' };
  }

  if (step === 2) {
    const min = Number(form.min);
    const max = Number(form.max);

    if (!min || !max) return { message: 'Both ends of the salary band are required.', field: 'j-min' };
    if (max < min) return { message: 'The ceiling has to be at or above the floor.', field: 'j-max' };
    if (!form.summary.trim()) return { message: 'Write a one-line summary.', field: 'j-summary' };
  }

  return null;
};

/* -------------------------------------------------------------- Review */

function Review({ job }) {
  return (
    <div className="card stack" id="review">
      <h2 style={{ fontSize: 'var(--t-lg)' }}>Check it over</h2>

      <dl className="co-facts" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        <div className="co-fact"><dt className="tick">Title</dt><dd className="co-fact-value">{job.title}</dd></div>
        <div className="co-fact"><dt className="tick">Company</dt><dd className="co-fact-value">{job.companyName}</dd></div>
        <div className="co-fact"><dt className="tick">Discipline</dt><dd className="co-fact-value">{job.discipline}</dd></div>
        <div className="co-fact"><dt className="tick">Level</dt><dd className="co-fact-value">{job.level}</dd></div>
        <div className="co-fact"><dt className="tick">Contract</dt><dd className="co-fact-value">{job.type}</dd></div>
        <div className="co-fact">
          <dt className="tick">Location</dt>
          <dd className="co-fact-value">{job.location}{job.remote ? ' · remote' : ''}</dd>
        </div>
        <div className="co-fact">
          <dt className="tick">Band</dt>
          <dd className="co-fact-value">{money(job.salaryMin)} – {money(job.salaryMax)}</dd>
        </div>
        <div className="co-fact"><dt className="tick">Skills</dt><dd className="co-fact-value">{job.tags.length || 'none'}</dd></div>
      </dl>

      <div>
        <p className="tick" style={{ marginBottom: 'var(--s2)' }}>Summary</p>
        <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)' }}>{job.summary}</p>
      </div>

      {job.responsibilities.length > 0 && (
        <div>
          <p className="tick" style={{ marginBottom: 'var(--s3)' }}>What they will do</p>
          <ul className="bullets">{job.responsibilities.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      )}

      {job.requirements.length > 0 && (
        <div>
          <p className="tick" style={{ marginBottom: 'var(--s3)' }}>What you are looking for</p>
          <ul className="bullets">{job.requirements.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Page */

export default function PostJob() {
  usePageMeta('Post a role — Nexjob', 'Publish a role in three steps, with a real salary band and a live preview.');

  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { status, jobs, companies, domain } = useBoard();
  const [publish, publishing] = useAction(api.publishPosting);

  const [form, setForm] = useState(BLANK);
  const [step, setStep] = useState(1);
  const [problem, setProblem] = useState(null);
  const [openedAt] = useState(() => new Date());

  const ready = status === 'ready';

  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  /* Land the cursor on whichever field a failed check was about. The step has
     been rendered by the time this runs, so the field is visible. */
  useEffect(() => {
    if (problem) document.getElementById(problem.field)?.focus();
  }, [problem]);

  /* ------------------------------------------------------------- Draft */

  const company = (ready && companyById(companies, user.companyId)) || {
    id: user.companyId || 'unknown',
    name: 'Your company',
    initial: '?',
    brandBg: '#2B36C4',
    brandFg: '#FFFFFF'
  };

  const disciplines = ready ? facets(jobs).disciplines : [];
  const discipline = form.discipline || disciplines[0] || '';

  const draft = {
    id: 'preview',
    title: form.title.trim() || 'Untitled role',
    companyId: company.id,
    companyName: company.name,
    company,
    discipline,
    level: form.level,
    type: form.type,
    location: form.location.trim() || 'Location not set',
    remote: form.remote,
    salaryMin: Number(form.min) || 0,
    salaryMax: Number(form.max) || 0,
    summary: form.summary.trim() || 'No summary yet.',
    tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    responsibilities: lines(form.resp),
    requirements: lines(form.req),
    featured: false,
    postedHoursAgo: 0,
    postedAt: openedAt
  };

  const hasBand = draft.salaryMin > 0 && draft.salaryMax > 0;

  /* ------------------------------------------------------------ Events */

  const next = () => {
    const found = check(form, step);
    setProblem(found);
    if (found) return;

    setStep(Math.min(STEPS.length, step + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = (event) => {
    event.preventDefault();

    const first = check(form, 1);
    const second = check(form, 2);

    if (first || second) {
      setStep(first ? 1 : 2);
      setProblem(first ?? second);
      return;
    }

    /* The preview needs a placeholder id, the company record and a date; the
       stored posting gets its own id, and the company is looked up by id. */
    publish({
      title: draft.title,
      companyId: draft.companyId,
      companyName: draft.companyName,
      discipline: draft.discipline,
      level: draft.level,
      type: draft.type,
      location: draft.location,
      remote: draft.remote,
      salaryMin: draft.salaryMin,
      salaryMax: draft.salaryMax,
      summary: draft.summary,
      tags: draft.tags,
      responsibilities: draft.responsibilities,
      requirements: draft.requirements,
      featured: false,
      postedBy: user.id
    })
      .then((posted) => {
        toast('Role published', 'ok');
        navigate(`/jobs/${posted.id}`);
      })
      .catch((error) => toast(error.message, 'stop'));
  };

  /* ----------------------------------------------------------- Render */

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

          <div className="wizard-steps" id="wizard-steps" style={{ marginTop: 'var(--s7)' }}>
            {STEPS.map((label, i) => {
              const n = i + 1;
              const state = n < step ? 'is-done' : n === step ? 'is-now' : '';

              return (
                <div key={label} className={`wizard-step ${state}`}>
                  <span className="wizard-step-bar" />
                  <span className="tick">{String(n).padStart(2, '0')} {label}</span>
                </div>
              );
            })}
          </div>

          <p className="form-error" id="post-error" role="alert" hidden={!problem}>{problem?.message}</p>

          <form id="post-form" onSubmit={onSubmit}>

            {/* Step 1 */}
            <fieldset data-step="1" style={{ border: 0, padding: 0, margin: 0 }} hidden={step !== 1}>
              <div className="card stack">
                <legend className="visually-hidden">The role</legend>

                <div className="field">
                  <label htmlFor="j-title">Role title</label>
                  <input className="input" type="text" id="j-title" required placeholder="Senior Frontend Engineer"
                         value={form.title} onChange={set('title')} />
                  <span className="field-note">The title people will search for, not an internal grade.</span>
                </div>

                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="j-discipline">Discipline</label>
                    <span className="select-wrap">
                      <select className="select" id="j-discipline" value={discipline} onChange={set('discipline')}>
                        {disciplines.map((d) => <option key={d}>{d}</option>)}
                      </select>
                    </span>
                  </div>

                  <div className="field">
                    <label htmlFor="j-level">Level</label>
                    <span className="select-wrap">
                      <select className="select" id="j-level" value={form.level} onChange={set('level')}>
                        {LEVELS.map((level) => <option key={level}>{level}</option>)}
                      </select>
                    </span>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="j-type">Contract</label>
                    <span className="select-wrap">
                      <select className="select" id="j-type" value={form.type} onChange={set('type')}>
                        {CONTRACTS.map((type) => <option key={type}>{type}</option>)}
                      </select>
                    </span>
                  </div>

                  <div className="field">
                    <label htmlFor="j-location">Location</label>
                    <input className="input" type="text" id="j-location" required placeholder="London, UK"
                           value={form.location} onChange={set('location')} />
                  </div>
                </div>

                <label className="check">
                  <input type="checkbox" id="j-remote" checked={form.remote}
                         onChange={(event) => setForm({ ...form, remote: event.target.checked })} />
                  <span>This role can be done remotely</span>
                </label>
              </div>
            </fieldset>

            {/* Step 2 */}
            <fieldset data-step="2" style={{ border: 0, padding: 0, margin: 0 }} hidden={step !== 2}>
              <div className="card stack">
                <legend className="visually-hidden">Pay and detail</legend>

                <div>
                  <p className="field-label" style={{ marginBottom: 'var(--s3)' }}>Salary band, USD per year</p>

                  <div className="grid-2">
                    <div className="field">
                      <label htmlFor="j-min">Floor</label>
                      <input className="input" type="number" id="j-min" required min="20000" max="600000"
                             step="1000" placeholder="140000" inputMode="numeric"
                             value={form.min} onChange={set('min')} />
                    </div>
                    <div className="field">
                      <label htmlFor="j-max">Ceiling</label>
                      <input className="input" type="number" id="j-max" required min="20000" max="600000"
                             step="1000" placeholder="180000" inputMode="numeric"
                             value={form.max} onChange={set('max')} />
                    </div>
                  </div>

                  <div style={{ marginTop: 'var(--s4)' }} id="band-preview">
                    {ready && hasBand && draft.salaryMax >= draft.salaryMin ? (
                      <>
                        <div className="row row--split" style={{ marginBottom: 6 }}>
                          <span className="tick">On the board's scale</span>
                          <span className="figure" style={{ fontSize: 'var(--t-xs)' }}>
                            {money(draft.salaryMin)} – {money(draft.salaryMax)}
                          </span>
                        </div>
                        <PayScale min={draft.salaryMin} max={draft.salaryMax} domain={domain} size="lg" />
                        <PayAxis domain={domain} />
                      </>
                    ) : <p className="field-note">Set both ends of the band to see it on the scale.</p>}
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="j-summary">One-line summary</label>
                  <textarea className="textarea" id="j-summary" rows={2} required
                            placeholder="What the person will actually work on."
                            value={form.summary} onChange={set('summary')} />
                </div>

                <div className="field">
                  <label htmlFor="j-tags">Skills</label>
                  <input className="input" type="text" id="j-tags" placeholder="React, TypeScript, Accessibility"
                         value={form.tags} onChange={set('tags')} />
                  <span className="field-note">Separate with commas. These are what candidate profiles match against.</span>
                </div>

                <div className="field">
                  <label htmlFor="j-resp">What they will do</label>
                  <textarea className="textarea" id="j-resp" rows={4} placeholder="One per line."
                            value={form.resp} onChange={set('resp')} />
                  <span className="field-note">One per line.</span>
                </div>

                <div className="field">
                  <label htmlFor="j-req">What you are looking for</label>
                  <textarea className="textarea" id="j-req" rows={4} placeholder="One per line."
                            value={form.req} onChange={set('req')} />
                  <span className="field-note">One per line.</span>
                </div>
              </div>
            </fieldset>

            {/* Step 3 */}
            <fieldset data-step="3" style={{ border: 0, padding: 0, margin: 0 }} hidden={step !== 3}>
              <legend className="visually-hidden">Review</legend>
              {step === 3 && <Review job={draft} />}
            </fieldset>

            <div className="row row--split" style={{ marginTop: 'var(--s6)' }}>
              <button type="button" className="btn btn--outline" id="wiz-back" hidden={step === 1}
                      onClick={() => { setProblem(null); setStep(step - 1); }}>
                Back
              </button>
              <div className="row row--tight" style={{ marginLeft: 'auto' }}>
                <button type="button" className="btn btn--primary" id="wiz-next" hidden={step === STEPS.length}
                        onClick={next}>
                  Continue
                </button>
                <button type="submit" className="btn btn--primary" id="wiz-publish" hidden={step !== STEPS.length}
                        disabled={publishing}>
                  {publishing ? 'Publishing…' : 'Publish role'}
                </button>
              </div>
            </div>
          </form>
        </div>

        <aside aria-label="Live preview">
          <div className="preview-sticky">
            <p className="tick" style={{ marginBottom: 'var(--s3)' }}>How it will look on the board</p>
            <div id="preview">
              {!ready ? <Skeletons count={1} />
                : hasBand ? <JobCard job={draft} domain={domain} preview />
                : (
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
