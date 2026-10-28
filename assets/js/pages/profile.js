/**
 * Profile and CV.
 *
 * One form, one stored object. The completeness meter uses the same scale
 * grammar as everything else, and the printable CV is the same data set as
 * a document rather than a second thing to keep up to date.
 */

import { $, $$, on, esc, escAttr, delegate } from '../core/dom.js';
import { load, facets } from '../core/data.js';
import { initShell } from '../core/shell.js';
import { getProfile, setProfile, profileCompleteness } from '../core/store.js';
import { currentUser, requireAuth } from '../core/auth.js';
import { toast } from '../core/toast.js';
import { icon } from '../components/icons.js';

initShell();

if (currentUser()?.role === 'employer') location.replace('./employer.html');

const user = requireAuth('seeker');

let profile = user ? getProfile(user.id) : null;

/* ------------------------------------------------------- Repeatables */

const experienceItem = (item = {}, index) => `
  <div class="repeat-item" data-repeat="experience" data-index="${index}">
    <button type="button" class="ibtn repeat-remove" data-remove="experience" data-index="${index}"
            aria-label="Remove this role">${icon('trash', 15)}</button>

    <div class="stack">
      <div class="grid-2">
        <div class="field">
          <label for="exp-role-${index}">Role</label>
          <input class="input" type="text" id="exp-role-${index}" data-field="role"
                 value="${escAttr(item.role || '')}" placeholder="Frontend Engineer">
        </div>
        <div class="field">
          <label for="exp-org-${index}">Company</label>
          <input class="input" type="text" id="exp-org-${index}" data-field="org"
                 value="${escAttr(item.org || '')}" placeholder="Acme">
        </div>
      </div>

      <div class="grid-2">
        <div class="field">
          <label for="exp-from-${index}">From</label>
          <input class="input" type="text" id="exp-from-${index}" data-field="from"
                 value="${escAttr(item.from || '')}" placeholder="2023">
        </div>
        <div class="field">
          <label for="exp-to-${index}">To</label>
          <input class="input" type="text" id="exp-to-${index}" data-field="to"
                 value="${escAttr(item.to || '')}" placeholder="Present">
        </div>
      </div>

      <div class="field">
        <label for="exp-detail-${index}">What you did</label>
        <textarea class="textarea" id="exp-detail-${index}" data-field="detail" rows="3"
                  placeholder="One or two lines, with a number in them if you have one.">${esc(item.detail || '')}</textarea>
      </div>
    </div>
  </div>`;

const educationItem = (item = {}, index) => `
  <div class="repeat-item" data-repeat="education" data-index="${index}">
    <button type="button" class="ibtn repeat-remove" data-remove="education" data-index="${index}"
            aria-label="Remove this qualification">${icon('trash', 15)}</button>

    <div class="stack">
      <div class="field">
        <label for="edu-what-${index}">Qualification</label>
        <input class="input" type="text" id="edu-what-${index}" data-field="what"
               value="${escAttr(item.what || '')}" placeholder="BSc Computer Science">
      </div>

      <div class="grid-2">
        <div class="field">
          <label for="edu-where-${index}">Institution</label>
          <input class="input" type="text" id="edu-where-${index}" data-field="where"
                 value="${escAttr(item.where || '')}" placeholder="University of Delhi">
        </div>
        <div class="field">
          <label for="edu-year-${index}">Year</label>
          <input class="input" type="text" id="edu-year-${index}" data-field="year"
                 value="${escAttr(item.year || '')}" placeholder="2024">
        </div>
      </div>
    </div>
  </div>`;

const renderRepeatables = () => {
  $('#exp-list').innerHTML = profile.experience.length
    ? profile.experience.map(experienceItem).join('')
    : '<p class="tick">Nothing added yet. Even one role helps a lot.</p>';

  $('#edu-list').innerHTML = profile.education.length
    ? profile.education.map(educationItem).join('')
    : '<p class="tick">Nothing added yet.</p>';
};

/* ------------------------------------------------------------- Skills */

const renderSkills = () => {
  $('#skill-list').innerHTML = profile.skills.length
    ? profile.skills.map((skill) => `
        <span class="skill-chip">
          ${esc(skill)}
          <button type="button" data-remove-skill="${escAttr(skill)}" aria-label="Remove ${escAttr(skill)}">×</button>
        </span>`).join('')
    : '<p class="tick">No skills yet. Add three or four to start getting matches.</p>';
};

/* ---------------------------------------------------------------- Rail */

const renderRail = () => {
  const score = profileCompleteness(profile);

  const checks = [
    ['Headline', !!profile.headline],
    ['About', !!profile.about && profile.about.length > 40],
    ['Location', !!profile.location],
    ['Three or more skills', profile.skills.length >= 3],
    ['One role of experience', profile.experience.length >= 1],
    ['Education', profile.education.length >= 1],
    ['A link', Object.values(profile.links).some(Boolean)],
    ['What you are open to', profile.openTo.length > 0]
  ];

  $('#profile-rail').innerHTML = `
    <div class="card">
      <p class="tick">Profile completeness</p>

      <div class="row row--split" style="margin:var(--s3) 0 6px;align-items:baseline">
        <span style="font-size:var(--t-sm);color:var(--ink-2)">
          ${checks.filter(([, ok]) => ok).length} of ${checks.length} done
        </span>
        <span class="figure" style="font-size:var(--t-md)">${score}%</span>
      </div>

      <div class="meter meter--lg ${score === 100 ? 'meter--ok' : 'meter--flag'}">
        <div class="meter-fill" style="--v:${score}%"></div>
      </div>

      <ul class="stack-2" style="margin-top:var(--s5)">
        ${checks.map(([label, ok]) => `
          <li class="row row--tight" style="gap:var(--s2);font-size:var(--t-sm);
                     color:${ok ? 'var(--ink-2)' : 'var(--ink-3)'}">
            <span style="color:${ok ? 'var(--ok)' : 'var(--rule)'};display:flex">${icon('check', 14)}</span>
            ${esc(label)}
          </li>`).join('')}
      </ul>
    </div>

    <div class="card">
      <p class="tick">Why it matters</p>
      <p style="font-size:var(--t-sm);color:var(--ink-2);margin-top:var(--s3)">
        Your skills are what the dashboard scores open roles against, and what the
        readiness meter on each company's route page compares to their focus areas.
      </p>
      <a class="btn btn--outline btn--block btn--sm" href="./dashboard.html#recommended"
         style="margin-top:var(--s4)">See your matches</a>
    </div>`;
};

/* ------------------------------------------------------------ Read/write */

const readForm = () => {
  const readRepeat = (selector, fields) => $$(selector).map((node) => {
    const item = {};
    fields.forEach((field) => {
      item[field] = $(`[data-field="${field}"]`, node)?.value.trim() ?? '';
    });
    return item;
  }).filter((item) => Object.values(item).some(Boolean));

  return {
    headline: $('#p-headline').value.trim(),
    about: $('#p-about').value.trim(),
    location: $('#p-location').value.trim(),
    discipline: $('#p-discipline').value,
    level: $('#p-level').value,
    skills: profile.skills,
    experience: readRepeat('[data-repeat="experience"]', ['role', 'org', 'from', 'to', 'detail']),
    education: readRepeat('[data-repeat="education"]', ['what', 'where', 'year']),
    links: {
      website: $('#p-website').value.trim(),
      github: $('#p-github').value.trim(),
      linkedin: $('#p-linkedin').value.trim()
    },
    openTo: $$('input[name="openTo"]:checked').map((input) => input.value)
  };
};

const fillForm = () => {
  $('#p-headline').value = profile.headline;
  $('#p-about').value = profile.about;
  $('#p-location').value = profile.location;
  $('#p-discipline').value = profile.discipline;
  $('#p-level').value = profile.level;
  $('#p-website').value = profile.links.website;
  $('#p-github').value = profile.links.github;
  $('#p-linkedin').value = profile.links.linkedin;

  $$('input[name="openTo"]').forEach((input) => {
    input.checked = profile.openTo.includes(input.value);
  });

  renderSkills();
  renderRepeatables();
  renderRail();
  renderCv();
};

/* ------------------------------------------------------- Printable CV */

const renderCv = () => {
  $('#cv-print').innerHTML = `
    <div class="wrap" style="padding-block:var(--s6)">
      <h1 style="font-size:2rem">${esc(user.name)}</h1>
      <p style="margin-top:var(--s2);color:var(--ink-2)">
        ${esc(profile.headline || `${profile.level} ${profile.discipline}`)}
      </p>
      <p class="tick" style="margin-top:var(--s2)">
        ${esc([user.email, profile.location, ...Object.values(profile.links).filter(Boolean)]
          .filter(Boolean).join(' · '))}
      </p>

      ${profile.about ? `
        <section style="margin-top:var(--s6)">
          <h2 style="font-size:var(--t-lg)">About</h2>
          <p style="margin-top:var(--s2);font-size:var(--t-sm)">${esc(profile.about)}</p>
        </section>` : ''}

      ${profile.skills.length ? `
        <section style="margin-top:var(--s6)">
          <h2 style="font-size:var(--t-lg)">Skills</h2>
          <p style="margin-top:var(--s2);font-size:var(--t-sm)">${esc(profile.skills.join(' · '))}</p>
        </section>` : ''}

      ${profile.experience.length ? `
        <section style="margin-top:var(--s6)">
          <h2 style="font-size:var(--t-lg)">Experience</h2>
          ${profile.experience.map((item) => `
            <div style="margin-top:var(--s4)">
              <p style="font-weight:600;font-size:var(--t-sm)">
                ${esc(item.role)}${item.org ? ` — ${esc(item.org)}` : ''}
              </p>
              <p class="tick" style="margin-top:2px">${esc([item.from, item.to].filter(Boolean).join(' – '))}</p>
              ${item.detail ? `<p style="margin-top:var(--s2);font-size:var(--t-sm)">${esc(item.detail)}</p>` : ''}
            </div>`).join('')}
        </section>` : ''}

      ${profile.education.length ? `
        <section style="margin-top:var(--s6)">
          <h2 style="font-size:var(--t-lg)">Education</h2>
          ${profile.education.map((item) => `
            <p style="margin-top:var(--s3);font-size:var(--t-sm)">
              <strong>${esc(item.what)}</strong>${item.where ? ` — ${esc(item.where)}` : ''}
              ${item.year ? ` (${esc(item.year)})` : ''}
            </p>`).join('')}
        </section>` : ''}
    </div>`;
};

/* -------------------------------------------------------------- Events */

delegate(document, 'click', '[data-add]', (event, button) => {
  const which = button.dataset.add;
  profile = { ...readForm(), skills: profile.skills };
  profile[which] = [...profile[which], {}];
  renderRepeatables();
});

delegate(document, 'click', '[data-remove]', (event, button) => {
  const which = button.dataset.remove;
  const index = Number(button.dataset.index);

  profile = { ...readForm(), skills: profile.skills };
  profile[which] = profile[which].filter((_, i) => i !== index);
  renderRepeatables();
});

const addSkill = () => {
  const input = $('#p-skill');
  const value = input.value.trim();

  if (!value) return;

  if (profile.skills.some((s) => s.toLowerCase() === value.toLowerCase())) {
    toast('That skill is already on your profile');
    input.value = '';
    return;
  }

  profile.skills = [...profile.skills, value];
  input.value = '';
  input.focus();
  renderSkills();
  renderRail();
};

on($('#p-skill-add'), 'click', addSkill);

on($('#p-skill'), 'keydown', (event) => {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault();
    addSkill();
  }
});

delegate(document, 'click', '[data-remove-skill]', (event, button) => {
  profile.skills = profile.skills.filter((s) => s !== button.dataset.removeSkill);
  renderSkills();
  renderRail();
});

on($('#profile-form'), 'submit', (event) => {
  event.preventDefault();

  profile = setProfile(user.id, readForm());
  renderRail();
  renderCv();
  toast('Profile saved', 'ok');
});

/* Keep the meter honest as they type, without saving on every keystroke. */
on($('#profile-form'), 'input', () => {
  profile = { ...readForm(), skills: profile.skills };
  renderRail();
});

on($('#print-cv'), 'click', () => {
  profile = setProfile(user.id, readForm());
  renderCv();
  window.print();
});

/* ---------------------------------------------------------------- Boot */

load().then(({ jobs }) => {
  if (!user) return;

  const { disciplines } = facets(jobs);
  $('#p-discipline').innerHTML = disciplines.map((d) => `<option>${esc(d)}</option>`).join('');

  /* Every skill named across the board, offered as suggestions. */
  const allTags = [...new Set(jobs.flatMap((j) => j.tags || []))].sort();
  $('#skill-suggestions').innerHTML = allTags.map((t) => `<option value="${escAttr(t)}">`).join('');

  fillForm();
}).catch(() => {
  if (user) fillForm();
});
