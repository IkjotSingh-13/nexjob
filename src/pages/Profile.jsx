/**
 * Profile and CV. One form, saved as one object. The same data is laid out
 * as a CV when printing.
 */

import { useContext, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useBoardData } from '../lib/hooks.js';
import { facets, LEVELS } from '../lib/data.js';
import { uniqueSorted } from '../lib/format.js';
import { getProfile, setProfile, profileChecks, profileCompleteness } from '../lib/store.js';
import { UserContext } from '../lib/UserContext.jsx';
import { toast } from '../lib/toast.js';
import Icon from '../components/Icon.jsx';

const OPEN_TO = ['Remote', 'On-site', 'Contract', 'Internship', 'Relocation'];
const NEW_ROLE = { role: '', org: '', from: '', to: '', detail: '' };
const NEW_QUALIFICATION = { what: '', where: '', year: '' };

/** A copy of an entry with every field trimmed: { role: ' Dev ' } -> { role: 'Dev' }. Missing -> ''. */
const trimAll = (item) => {
  const result = {};
  for (const key in item) {
    result[key] = (item[key] || '').trim();
  }
  return result;
};

/** True when at least one field of an entry has some text. */
const hasText = (item) => {
  for (const key in item) {
    if (item[key]) return true;
  }
  return false;
};

/* Trim every field, and drop entries that were left completely empty. */
const filled = (items) => {
  const result = [];
  for (const item of items) {
    const trimmed = trimAll(item);
    if (hasText(trimmed)) {
      result.push(trimmed);
    }
  }
  return result;
};

/** The profile as it gets saved. */
const clean = (form) => ({
  ...form,
  headline: form.headline.trim(),
  about: form.about.trim(),
  location: form.location.trim(),
  experience: filled(form.experience),
  education: filled(form.education),
  links: trimAll(form.links)
});

/* Only job seekers get here: main.jsx wraps this page in <RequireRole role="seeker">. */
export default function Profile() {
  const { user } = useContext(UserContext);
  return <ProfileForm user={user} />;
}

function ProfileForm({ user }) {
  const { data } = useBoardData();
  const [form, setForm] = useState(getProfile(user.id));   // starts with the saved profile
  const [skillText, setSkillText] = useState('');
  const skillInput = useRef(null);

  const profile = clean(form);   // what the meter, the CV and Save all use

  /* Small helpers to change one part of the form. */

  /* change('headline', 'Dev') -> a copy of the form with the new headline. */
  const change = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const changeLink = (name, value) => {
    change('links', { ...form.links, [name]: value });
  };

  /* Change one field of one entry in a list (experience or education). */
  const changeItem = (list, index, field, value) => {
    const items = [...form[list]];                        // a copy of the list
    items[index] = { ...items[index], [field]: value };   // a copy of that entry, with the new value
    change(list, items);
  };

  /* Blocks that were added but never filled in are dropped whenever one is added or removed. */
  const addItem = (list, blank) => {
    const kept = filled(form[list]);
    change(list, [...kept, { ...blank }]);
  };

  const removeItem = (list, index) => {
    const others = form[list].filter((item, i) => i !== index);   // every entry except this one
    change(list, filled(others));
  };

  const toggleOpenTo = (value) => {
    let chosen;
    if (form.openTo.includes(value)) {
      chosen = form.openTo.filter((v) => v !== value);   // was ticked: take it out
    } else {
      chosen = [...form.openTo, value];                  // was not: add it
    }
    change('openTo', OPEN_TO.filter((v) => chosen.includes(v)));   // keep on-screen order
  };

  const addSkill = () => {
    const skill = skillText.trim();
    if (!skill) return;

    if (form.skills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
      toast('That skill is already on your profile');
    } else {
      change('skills', [...form.skills, skill]);
      skillInput.current.focus();
    }
    setSkillText('');
  };

  const save = (event) => {
    event.preventDefault();
    setProfile(user.id, profile);
    toast('Profile saved', 'ok');
  };

  const printCv = () => {
    setProfile(user.id, profile);
    window.print();
  };

  /* Choices for the discipline dropdown, and every skill any posting names (A–Z, for suggestions). */
  let disciplines = [];
  let allTags = [];
  if (data) {
    disciplines = facets(data.jobs).disciplines;

    const tags = [];
    for (const job of data.jobs) {
      if (job.tags) {
        tags.push(...job.tags);
      }
    }
    allTags = uniqueSorted(tags);
  }

  return (
    <>
      <section className="strip strip--tight">
        <div className="wrap split split--rail-right">

          <form className="stack-6 no-print" onSubmit={save}>
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
                  <input className="input" type="text" id="p-headline" placeholder="Frontend engineer who cares about accessibility"
                         value={form.headline} onChange={(e) => change('headline', e.target.value)} />
                  <span className="field-note">One line. The first thing anyone reads.</span>
                </div>

                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="p-discipline">Discipline</label>
                    <span className="select-wrap">
                      <select className="select" id="p-discipline" value={form.discipline}
                              onChange={(e) => change('discipline', e.target.value)}>
                        {disciplines.map((d) => <option key={d}>{d}</option>)}
                      </select>
                    </span>
                  </div>

                  <div className="field">
                    <label htmlFor="p-level">Level</label>
                    <span className="select-wrap">
                      <select className="select" id="p-level" value={form.level} onChange={(e) => change('level', e.target.value)}>
                        {LEVELS.map((level) => <option key={level}>{level}</option>)}
                      </select>
                    </span>
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="p-location">Where you are</label>
                  <input className="input" type="text" id="p-location" placeholder="Bengaluru, India"
                         value={form.location} onChange={(e) => change('location', e.target.value)} />
                </div>

                <div className="field">
                  <label htmlFor="p-about">About you</label>
                  <textarea className="textarea" id="p-about" rows="5"
                            placeholder="A short paragraph on what you build and what you want next."
                            value={form.about} onChange={(e) => change('about', e.target.value)} />
                </div>

                <fieldset className="field" style={{ border: 0, padding: 0 }}>
                  <legend className="field-label">Open to</legend>
                  <div className="row" style={{ gap: 'var(--s2) var(--s5)' }}>
                    {OPEN_TO.map((value) => (
                      <label className="check" key={value}>
                        <input type="checkbox" checked={form.openTo.includes(value)} onChange={() => toggleOpenTo(value)} />
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
                         list="skill-suggestions" ref={skillInput}
                         value={skillText} onChange={(e) => setSkillText(e.target.value)}
                         onKeyDown={(e) => {
                           if (e.key === 'Enter' || e.key === ',') {
                             e.preventDefault();
                             addSkill();
                           }
                         }} />
                  <datalist id="skill-suggestions">
                    {allTags.map((tag) => <option key={tag} value={tag} />)}
                  </datalist>
                  <button type="button" className="btn btn--outline" onClick={addSkill}>Add</button>
                </div>
              </div>

              <div className="skill-list">
                {form.skills.length === 0 && <p className="tick">No skills yet. Add three or four to start getting matches.</p>}
                {form.skills.map((skill) => (
                  <span className="skill-chip" key={skill}>
                    {skill}
                    <button type="button" aria-label={`Remove ${skill}`}
                            onClick={() => change('skills', form.skills.filter((s) => s !== skill))}>×</button>
                  </span>
                ))}
              </div>
            </section>

            {/* Experience */}
            <section className="card" aria-labelledby="exp-title">
              <div className="row row--split" style={{ marginBottom: 'var(--s5)' }}>
                <h2 id="exp-title" style={{ fontSize: 'var(--t-lg)' }}>Experience</h2>
                <button type="button" className="btn btn--outline btn--sm" onClick={() => addItem('experience', NEW_ROLE)}>
                  Add a role
                </button>
              </div>

              <div>
                {form.experience.length === 0 && <p className="tick">Nothing added yet. Even one role helps a lot.</p>}
                {form.experience.map((item, i) => (
                  <div className="repeat-item" key={i}>
                    <RemoveButton label="Remove this role" onClick={() => removeItem('experience', i)} />
                    <div className="stack">
                      <div className="grid-2">
                        <TextField id={`exp-role-${i}`} label="Role" placeholder="Frontend Engineer"
                                   value={item.role} onChange={(v) => changeItem('experience', i, 'role', v)} />
                        <TextField id={`exp-org-${i}`} label="Company" placeholder="Acme"
                                   value={item.org} onChange={(v) => changeItem('experience', i, 'org', v)} />
                      </div>
                      <div className="grid-2">
                        <TextField id={`exp-from-${i}`} label="From" placeholder="2023"
                                   value={item.from} onChange={(v) => changeItem('experience', i, 'from', v)} />
                        <TextField id={`exp-to-${i}`} label="To" placeholder="Present"
                                   value={item.to} onChange={(v) => changeItem('experience', i, 'to', v)} />
                      </div>
                      <div className="field">
                        <label htmlFor={`exp-detail-${i}`}>What you did</label>
                        <textarea className="textarea" id={`exp-detail-${i}`} rows="3"
                                  placeholder="One or two lines, with a number in them if you have one."
                                  value={item.detail || ''} onChange={(e) => changeItem('experience', i, 'detail', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Education */}
            <section className="card" aria-labelledby="edu-title">
              <div className="row row--split" style={{ marginBottom: 'var(--s5)' }}>
                <h2 id="edu-title" style={{ fontSize: 'var(--t-lg)' }}>Education</h2>
                <button type="button" className="btn btn--outline btn--sm" onClick={() => addItem('education', NEW_QUALIFICATION)}>
                  Add a qualification
                </button>
              </div>

              <div>
                {form.education.length === 0 && <p className="tick">Nothing added yet.</p>}
                {form.education.map((item, i) => (
                  <div className="repeat-item" key={i}>
                    <RemoveButton label="Remove this qualification" onClick={() => removeItem('education', i)} />
                    <div className="stack">
                      <TextField id={`edu-what-${i}`} label="Qualification" placeholder="BSc Computer Science"
                                 value={item.what} onChange={(v) => changeItem('education', i, 'what', v)} />
                      <div className="grid-2">
                        <TextField id={`edu-where-${i}`} label="Institution" placeholder="University of Delhi"
                                   value={item.where} onChange={(v) => changeItem('education', i, 'where', v)} />
                        <TextField id={`edu-year-${i}`} label="Year" placeholder="2024"
                                   value={item.year} onChange={(v) => changeItem('education', i, 'year', v)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Links */}
            <section className="card" aria-labelledby="links-title">
              <h2 id="links-title" style={{ fontSize: 'var(--t-lg)', marginBottom: 'var(--s5)' }}>Links</h2>

              <div className="stack">
                <TextField id="p-website" label="Website or portfolio" type="url" placeholder="https://"
                           value={form.links.website} onChange={(v) => changeLink('website', v)} />
                <TextField id="p-github" label="GitHub" type="url" placeholder="https://github.com/"
                           value={form.links.github} onChange={(v) => changeLink('github', v)} />
                <TextField id="p-linkedin" label="LinkedIn" type="url" placeholder="https://linkedin.com/in/"
                           value={form.links.linkedin} onChange={(v) => changeLink('linkedin', v)} />
              </div>
            </section>

            <div className="row row--end" style={{ gap: 'var(--s2)' }}>
              <button type="button" className="btn btn--outline" onClick={printCv}>Print CV</button>
              <button type="submit" className="btn btn--primary">Save profile</button>
            </div>
          </form>

          <aside className="no-print" aria-label="Profile summary">
            <div className="rail-sticky stack"><Completeness profile={profile} /></div>
          </aside>
        </div>
      </section>

      {/* The same data as a document. Only visible when printing. */}
      <div className="print-only"><Cv user={user} profile={profile} /></div>
    </>
  );
}

function TextField({ id, label, value, onChange, type = 'text', placeholder }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input className="input" type={type} id={id} placeholder={placeholder}
             value={value || ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function RemoveButton({ label, onClick }) {
  return (
    <button type="button" className="ibtn repeat-remove" aria-label={label} onClick={onClick}>
      <Icon name="trash" size={15} />
    </button>
  );
}

function Completeness({ profile }) {
  const checks = profileChecks(profile);
  const score = profileCompleteness(profile);

  return (
    <>
      <div className="card">
        <p className="tick">Profile completeness</p>

        <div className="row row--split" style={{ margin: 'var(--s3) 0 6px', alignItems: 'baseline' }}>
          <span style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)' }}>
            {checks.filter((c) => c.done).length} of {checks.length} done
          </span>
          <span className="figure" style={{ fontSize: 'var(--t-md)' }}>{score}%</span>
        </div>

        <div className={`meter meter--lg ${score === 100 ? 'meter--ok' : 'meter--flag'}`}>
          <div className="meter-fill" style={{ '--v': `${score}%` }} />
        </div>

        <ul className="stack-2" style={{ marginTop: 'var(--s5)' }}>
          {checks.map((check) => (
            <li className="row row--tight" key={check.label}
                style={{ gap: 'var(--s2)', fontSize: 'var(--t-sm)', color: check.done ? 'var(--ink-2)' : 'var(--ink-3)' }}>
              <span style={{ color: check.done ? 'var(--ok)' : 'var(--rule)', display: 'flex' }}><Icon name="check" size={14} /></span>
              {check.label}
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
        <Link className="btn btn--outline btn--block btn--sm" to="/dashboard#recommended" style={{ marginTop: 'var(--s4)' }}>
          See your matches
        </Link>
      </div>
    </>
  );
}

function Cv({ user, profile }) {
  /* The contact line on the CV: email, place and links, leaving out empty ones. */
  const contactParts = [user.email, profile.location];
  for (const name in profile.links) {
    contactParts.push(profile.links[name]);
  }
  const contact = contactParts.filter((part) => part).join(' · ');
  const section = { marginTop: 'var(--s6)' };
  const heading = { fontSize: 'var(--t-lg)' };

  return (
    <div className="wrap" style={{ paddingBlock: 'var(--s6)' }}>
      <h1 style={{ fontSize: '2rem' }}>{user.name}</h1>
      <p style={{ marginTop: 'var(--s2)', color: 'var(--ink-2)' }}>
        {profile.headline || `${profile.level} ${profile.discipline}`}
      </p>
      <p className="tick" style={{ marginTop: 'var(--s2)' }}>{contact}</p>

      {profile.about && (
        <section style={section}>
          <h2 style={heading}>About</h2>
          <p style={{ marginTop: 'var(--s2)', fontSize: 'var(--t-sm)' }}>{profile.about}</p>
        </section>
      )}

      {profile.skills.length > 0 && (
        <section style={section}>
          <h2 style={heading}>Skills</h2>
          <p style={{ marginTop: 'var(--s2)', fontSize: 'var(--t-sm)' }}>{profile.skills.join(' · ')}</p>
        </section>
      )}

      {profile.experience.length > 0 && (
        <section style={section}>
          <h2 style={heading}>Experience</h2>
          {profile.experience.map((item, i) => (
            <div style={{ marginTop: 'var(--s4)' }} key={i}>
              <p style={{ fontWeight: 600, fontSize: 'var(--t-sm)' }}>{item.role}{item.org && ` — ${item.org}`}</p>
              <p className="tick" style={{ marginTop: 2 }}>{[item.from, item.to].filter(Boolean).join(' – ')}</p>
              {item.detail && <p style={{ marginTop: 'var(--s2)', fontSize: 'var(--t-sm)' }}>{item.detail}</p>}
            </div>
          ))}
        </section>
      )}

      {profile.education.length > 0 && (
        <section style={section}>
          <h2 style={heading}>Education</h2>
          {profile.education.map((item, i) => (
            <p style={{ marginTop: 'var(--s3)', fontSize: 'var(--t-sm)' }} key={i}>
              <strong>{item.what}</strong>{item.where && ` — ${item.where}`}{item.year && ` (${item.year})`}
            </p>
          ))}
        </section>
      )}
    </div>
  );
}
