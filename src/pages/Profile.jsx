/**
 * Profile and CV.
 *
 * One form, one stored object. The completeness meter uses the same scale
 * grammar as everything else, and the printable CV is the same data set as a
 * document rather than a second thing to keep up to date.
 *
 * `draft` is what the form shows. `clean` is the same thing trimmed, with
 * blank repeatable rows dropped — that is what is saved, scored and printed,
 * so the meter stays honest as you type without anything being stored until
 * you press Save.
 */

import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBoard } from '../context/BoardContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { facets } from '../lib/jobs.js';
import { profileChecks, profileCompleteness } from '../lib/profile.js';
import * as api from '../services/api.js';
import { useAction } from '../hooks/useAction.js';
import { usePageMeta } from '../hooks/usePageMeta.js';
import { useProfile } from '../hooks/useStore.js';
import { Icon } from '../components/Icon.jsx';

const OPEN_TO = ['Remote', 'On-site', 'Contract', 'Internship', 'Relocation'];

const LEVELS = ['Junior', 'Mid', 'Senior', 'Staff', 'Principal'];

const EXPERIENCE_FIELDS = ['role', 'org', 'from', 'to', 'detail'];
const EDUCATION_FIELDS = ['what', 'where', 'year'];

/** Trim every field of a repeatable row, and drop rows with nothing in them. */
const cleanRows = (rows, fields) => rows
  .map((row) => Object.fromEntries(fields.map((field) => [field, (row[field] ?? '').trim()])))
  .filter((row) => Object.values(row).some(Boolean));

const cleanProfile = (draft) => ({
  ...draft,
  headline: draft.headline.trim(),
  about: draft.about.trim(),
  location: draft.location.trim(),
  experience: cleanRows(draft.experience, EXPERIENCE_FIELDS),
  education: cleanRows(draft.education, EDUCATION_FIELDS),
  links: Object.fromEntries(Object.entries(draft.links).map(([key, value]) => [key, value.trim()]))
});

/* ------------------------------------------------------- Repeatables */

function Field({ id, label, ...input }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input className="input" type="text" id={id} {...input} />
    </div>
  );
}

function ExperienceItem({ item, index, onChange, onRemove }) {
  const set = (field) => (event) => onChange(field, event.target.value);

  return (
    <div className="repeat-item">
      <button type="button" className="ibtn repeat-remove" onClick={onRemove} aria-label="Remove this role">
        <Icon name="trash" size={15} />
      </button>

      <div className="stack">
        <div className="grid-2">
          <Field id={`exp-role-${index}`} label="Role" placeholder="Frontend Engineer"
                 value={item.role || ''} onChange={set('role')} />
          <Field id={`exp-org-${index}`} label="Company" placeholder="Acme"
                 value={item.org || ''} onChange={set('org')} />
        </div>

        <div className="grid-2">
          <Field id={`exp-from-${index}`} label="From" placeholder="2023"
                 value={item.from || ''} onChange={set('from')} />
          <Field id={`exp-to-${index}`} label="To" placeholder="Present"
                 value={item.to || ''} onChange={set('to')} />
        </div>

        <div className="field">
          <label htmlFor={`exp-detail-${index}`}>What you did</label>
          <textarea className="textarea" id={`exp-detail-${index}`} rows={3}
                    placeholder="One or two lines, with a number in them if you have one."
                    value={item.detail || ''} onChange={set('detail')} />
        </div>
      </div>
    </div>
  );
}

function EducationItem({ item, index, onChange, onRemove }) {
  const set = (field) => (event) => onChange(field, event.target.value);

  return (
    <div className="repeat-item">
      <button type="button" className="ibtn repeat-remove" onClick={onRemove} aria-label="Remove this qualification">
        <Icon name="trash" size={15} />
      </button>

      <div className="stack">
        <Field id={`edu-what-${index}`} label="Qualification" placeholder="BSc Computer Science"
               value={item.what || ''} onChange={set('what')} />

        <div className="grid-2">
          <Field id={`edu-where-${index}`} label="Institution" placeholder="University of Delhi"
                 value={item.where || ''} onChange={set('where')} />
          <Field id={`edu-year-${index}`} label="Year" placeholder="2024"
                 value={item.year || ''} onChange={set('year')} />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Rail */

function Rail({ profile }) {
  const checks = profileChecks(profile);
  const score = profileCompleteness(profile);

  return (
    <>
      <div className="card">
        <p className="tick">Profile completeness</p>

        <div className="row row--split" style={{ margin: 'var(--s3) 0 6px', alignItems: 'baseline' }}>
          <span style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)' }}>
            {checks.filter(([, ok]) => ok).length} of {checks.length} done
          </span>
          <span className="figure" style={{ fontSize: 'var(--t-md)' }}>{score}%</span>
        </div>

        <div className={`meter meter--lg ${score === 100 ? 'meter--ok' : 'meter--flag'}`}>
          <div className="meter-fill" style={{ '--v': `${score}%` }} />
        </div>

        <ul className="stack-2" style={{ marginTop: 'var(--s5)' }}>
          {checks.map(([label, ok]) => (
            <li key={label} className="row row--tight"
                style={{ gap: 'var(--s2)', fontSize: 'var(--t-sm)', color: ok ? 'var(--ink-2)' : 'var(--ink-3)' }}>
              <span style={{ color: ok ? 'var(--ok)' : 'var(--rule)', display: 'flex' }}>
                <Icon name="check" size={14} />
              </span>
              {label}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <p className="tick">Why it matters</p>
        <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', marginTop: 'var(--s3)' }}>
          Your skills are what the dashboard scores open roles against, and what the
          readiness meter on each company's route page compares to their focus areas.
        </p>
        <Link className="btn btn--outline btn--block btn--sm" to="/dashboard#recommended"
              style={{ marginTop: 'var(--s4)' }}>
          See your matches
        </Link>
      </div>
    </>
  );
}

/* ------------------------------------------------------- Printable CV */

function Cv({ user, profile }) {
  const contact = [user.email, profile.location, ...Object.values(profile.links).filter(Boolean)]
    .filter(Boolean).join(' · ');

  return (
    <div className="wrap" style={{ paddingBlock: 'var(--s6)' }}>
      <h1 style={{ fontSize: '2rem' }}>{user.name}</h1>
      <p style={{ marginTop: 'var(--s2)', color: 'var(--ink-2)' }}>
        {profile.headline || `${profile.level} ${profile.discipline}`}
      </p>
      <p className="tick" style={{ marginTop: 'var(--s2)' }}>{contact}</p>

      {profile.about && (
        <section style={{ marginTop: 'var(--s6)' }}>
          <h2 style={{ fontSize: 'var(--t-lg)' }}>About</h2>
          <p style={{ marginTop: 'var(--s2)', fontSize: 'var(--t-sm)' }}>{profile.about}</p>
        </section>
      )}

      {profile.skills.length > 0 && (
        <section style={{ marginTop: 'var(--s6)' }}>
          <h2 style={{ fontSize: 'var(--t-lg)' }}>Skills</h2>
          <p style={{ marginTop: 'var(--s2)', fontSize: 'var(--t-sm)' }}>{profile.skills.join(' · ')}</p>
        </section>
      )}

      {profile.experience.length > 0 && (
        <section style={{ marginTop: 'var(--s6)' }}>
          <h2 style={{ fontSize: 'var(--t-lg)' }}>Experience</h2>
          {profile.experience.map((item, i) => (
            <div key={i} style={{ marginTop: 'var(--s4)' }}>
              <p style={{ fontWeight: 600, fontSize: 'var(--t-sm)' }}>
                {item.role}{item.org ? ` — ${item.org}` : ''}
              </p>
              <p className="tick" style={{ marginTop: 2 }}>{[item.from, item.to].filter(Boolean).join(' – ')}</p>
              {item.detail && <p style={{ marginTop: 'var(--s2)', fontSize: 'var(--t-sm)' }}>{item.detail}</p>}
            </div>
          ))}
        </section>
      )}

      {profile.education.length > 0 && (
        <section style={{ marginTop: 'var(--s6)' }}>
          <h2 style={{ fontSize: 'var(--t-lg)' }}>Education</h2>
          {profile.education.map((item, i) => (
            <p key={i} style={{ marginTop: 'var(--s3)', fontSize: 'var(--t-sm)' }}>
              <strong>{item.what}</strong>{item.where ? ` — ${item.where}` : ''}
              {item.year ? ` (${item.year})` : ''}
            </p>
          ))}
        </section>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Page */

export default function Profile() {
  usePageMeta('Profile and CV — Nexjob', 'Build the profile employers read and the recommendations are scored against.');

  const { user } = useAuth();
  const toast = useToast();
  const { status, jobs } = useBoard();
  const [save, saving] = useAction(api.saveProfile);

  /* The form starts from what is stored and is then its own copy. */
  const stored = useProfile(user.id);
  const [draft, setDraft] = useState(stored);
  const [skillText, setSkillText] = useState('');
  const skillRef = useRef(null);

  const clean = useMemo(() => cleanProfile(draft), [draft]);

  const update = (patch) => setDraft((current) => ({ ...current, ...patch }));
  const updateLink = (field, value) => setDraft((current) => ({ ...current, links: { ...current.links, [field]: value } }));

  const changeRow = (kind, index, field, value) => setDraft((current) => ({
    ...current,
    [kind]: current[kind].map((row, i) => (i === index ? { ...row, [field]: value } : row))
  }));
  const addRow = (kind) => setDraft((current) => ({ ...current, [kind]: [...current[kind], {}] }));
  const removeRow = (kind, index) => setDraft((current) => ({
    ...current,
    [kind]: current[kind].filter((_, i) => i !== index)
  }));

  const toggleOpenTo = (value) => update({
    openTo: draft.openTo.includes(value) ? draft.openTo.filter((v) => v !== value) : [...draft.openTo, value]
  });

  /* ------------------------------------------------------------ Skills */

  const addSkill = () => {
    const value = skillText.trim();
    if (!value) return;

    if (draft.skills.some((s) => s.toLowerCase() === value.toLowerCase())) {
      toast('That skill is already on your profile');
      setSkillText('');
      return;
    }

    update({ skills: [...draft.skills, value] });
    setSkillText('');
    skillRef.current?.focus();
  };

  /* ------------------------------------------------------------- Save */

  const onSave = (event) => {
    event.preventDefault();

    save(user.id, clean)
      .then((saved) => {
        setDraft(saved);   /* blank rows are gone from what was stored, so from the form too */
        toast('Profile saved', 'ok');
      })
      .catch((error) => toast(error.message, 'stop'));
  };

  const onPrint = () => {
    save(user.id, clean)
      .then((saved) => {
        setDraft(saved);
        window.print();
      })
      .catch((error) => toast(error.message, 'stop'));
  };

  /* Every skill named across the board, offered as suggestions. */
  const ready = status === 'ready';
  const disciplines = ready ? facets(jobs).disciplines : [];
  if (!disciplines.includes(draft.discipline)) disciplines.push(draft.discipline);
  const suggestions = ready ? [...new Set(jobs.flatMap((j) => j.tags || []))].sort() : [];

  return (
    <>
      <section className="strip strip--tight">
        <div className="wrap split split--rail-right">

          <form className="stack-6 no-print" id="profile-form" onSubmit={onSave}>
            <div className="dash-head" style={{ marginBottom: 0 }}>
              <div>
                <p className="tick tick--flag">Profile and CV</p>
                <h1 style={{ marginTop: 'var(--s3)' }}>What you do</h1>
                <p style={{ marginTop: 'var(--s2)', color: 'var(--ink-2)', maxWidth: '52ch' }}>
                  This is what the recommendations are scored against, and what an employer
                  sees on your application. Stored in this browser only.
                </p>
              </div>
            </div>

            {/* Basics */}
            <section className="card" aria-labelledby="basics-title">
              <h2 id="basics-title" style={{ fontSize: 'var(--t-lg)', marginBottom: 'var(--s5)' }}>Basics</h2>

              <div className="stack">
                <div className="field">
                  <label htmlFor="p-headline">Headline</label>
                  <input className="input" type="text" id="p-headline"
                         placeholder="Frontend engineer who cares about accessibility"
                         value={draft.headline} onChange={(event) => update({ headline: event.target.value })} />
                  <span className="field-note">One line. The first thing anyone reads.</span>
                </div>

                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="p-discipline">Discipline</label>
                    <span className="select-wrap">
                      <select className="select" id="p-discipline" value={draft.discipline}
                              onChange={(event) => update({ discipline: event.target.value })}>
                        {disciplines.map((d) => <option key={d}>{d}</option>)}
                      </select>
                    </span>
                  </div>

                  <div className="field">
                    <label htmlFor="p-level">Level</label>
                    <span className="select-wrap">
                      <select className="select" id="p-level" value={draft.level}
                              onChange={(event) => update({ level: event.target.value })}>
                        {LEVELS.map((level) => <option key={level}>{level}</option>)}
                      </select>
                    </span>
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="p-location">Where you are</label>
                  <input className="input" type="text" id="p-location" placeholder="Bengaluru, India"
                         value={draft.location} onChange={(event) => update({ location: event.target.value })} />
                </div>

                <div className="field">
                  <label htmlFor="p-about">About you</label>
                  <textarea className="textarea" id="p-about" rows={5}
                            placeholder="A short paragraph on what you build and what you want next."
                            value={draft.about} onChange={(event) => update({ about: event.target.value })} />
                </div>

                <fieldset className="field" style={{ border: 0, padding: 0 }}>
                  <legend className="field-label">Open to</legend>
                  <div className="row" style={{ gap: 'var(--s2) var(--s5)' }}>
                    {OPEN_TO.map((value) => (
                      <label key={value} className="check">
                        <input type="checkbox" name="openTo" value={value}
                               checked={draft.openTo.includes(value)} onChange={() => toggleOpenTo(value)} />
                        <span>{value}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
            </section>

            {/* Skills */}
            <section className="card" aria-labelledby="skills-title">
              <h2 id="skills-title" style={{ fontSize: 'var(--t-lg)' }}>Skills</h2>
              <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)', margin: 'var(--s2) 0 var(--s5)' }}>
                These are matched word for word against what a posting asks for, so use the
                names the industry uses.
              </p>

              <div className="field">
                <label htmlFor="p-skill">Add a skill</label>
                <div className="skill-input-wrap">
                  <input className="input" type="text" id="p-skill" placeholder="TypeScript" autoComplete="off"
                         list="skill-suggestions" ref={skillRef} value={skillText}
                         onChange={(event) => setSkillText(event.target.value)}
                         onKeyDown={(event) => {
                           if (event.key === 'Enter' || event.key === ',') {
                             event.preventDefault();
                             addSkill();
                           }
                         }} />
                  <datalist id="skill-suggestions">
                    {suggestions.map((tag) => <option key={tag} value={tag} />)}
                  </datalist>
                  <button type="button" className="btn btn--outline" id="p-skill-add" onClick={addSkill}>Add</button>
                </div>
              </div>

              <div className="skill-list" id="skill-list">
                {draft.skills.length ? draft.skills.map((skill) => (
                  <span key={skill} className="skill-chip">
                    {skill}
                    <button type="button" aria-label={`Remove ${skill}`}
                            onClick={() => update({ skills: draft.skills.filter((s) => s !== skill) })}>×</button>
                  </span>
                )) : <p className="tick">No skills yet. Add three or four to start getting matches.</p>}
              </div>
            </section>

            {/* Experience */}
            <section className="card" aria-labelledby="exp-title">
              <div className="row row--split" style={{ marginBottom: 'var(--s5)' }}>
                <h2 id="exp-title" style={{ fontSize: 'var(--t-lg)' }}>Experience</h2>
                <button type="button" className="btn btn--outline btn--sm" onClick={() => addRow('experience')}>
                  Add a role
                </button>
              </div>

              <div id="exp-list">
                {draft.experience.length ? draft.experience.map((item, index) => (
                  <ExperienceItem key={index} item={item} index={index}
                                  onChange={(field, value) => changeRow('experience', index, field, value)}
                                  onRemove={() => removeRow('experience', index)} />
                )) : <p className="tick">Nothing added yet. Even one role helps a lot.</p>}
              </div>
            </section>

            {/* Education */}
            <section className="card" aria-labelledby="edu-title">
              <div className="row row--split" style={{ marginBottom: 'var(--s5)' }}>
                <h2 id="edu-title" style={{ fontSize: 'var(--t-lg)' }}>Education</h2>
                <button type="button" className="btn btn--outline btn--sm" onClick={() => addRow('education')}>
                  Add a qualification
                </button>
              </div>

              <div id="edu-list">
                {draft.education.length ? draft.education.map((item, index) => (
                  <EducationItem key={index} item={item} index={index}
                                 onChange={(field, value) => changeRow('education', index, field, value)}
                                 onRemove={() => removeRow('education', index)} />
                )) : <p className="tick">Nothing added yet.</p>}
              </div>
            </section>

            {/* Links */}
            <section className="card" aria-labelledby="links-title">
              <h2 id="links-title" style={{ fontSize: 'var(--t-lg)', marginBottom: 'var(--s5)' }}>Links</h2>

              <div className="stack">
                <div className="field">
                  <label htmlFor="p-website">Website or portfolio</label>
                  <input className="input" type="url" id="p-website" placeholder="https://"
                         value={draft.links.website} onChange={(event) => updateLink('website', event.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="p-github">GitHub</label>
                  <input className="input" type="url" id="p-github" placeholder="https://github.com/"
                         value={draft.links.github} onChange={(event) => updateLink('github', event.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="p-linkedin">LinkedIn</label>
                  <input className="input" type="url" id="p-linkedin" placeholder="https://linkedin.com/in/"
                         value={draft.links.linkedin} onChange={(event) => updateLink('linkedin', event.target.value)} />
                </div>
              </div>
            </section>

            <div className="row row--end" style={{ gap: 'var(--s2)' }}>
              <button type="button" className="btn btn--outline" id="print-cv" disabled={saving} onClick={onPrint}>
                Print CV
              </button>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </form>

          <aside className="no-print" aria-label="Profile summary">
            <div className="rail-sticky stack" id="profile-rail"><Rail profile={clean} /></div>
          </aside>
        </div>
      </section>

      {/* The same data, set as a document. Only visible when printing. */}
      <div className="print-only" id="cv-print"><Cv user={user} profile={clean} /></div>
    </>
  );
}
