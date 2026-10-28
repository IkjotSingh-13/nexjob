/**
 * How to get in.
 *
 * The third domain the scale grammar covers. A hiring bar is a position, an
 * interview loop is a track, and a focus area carries a weight — so this
 * page is built from the same meters and steps as the rest of the product
 * rather than a new set of shapes.
 *
 * Readiness is scored against the signed-in profile's skills, and the
 * reasons are shown rather than hidden.
 */

import { $, $$, esc, escAttr, delegate, query, setQuery, url } from '../core/dom.js';
import { load, prepFor, jobsAtCompany, readinessFor } from '../core/data.js';
import { money, plural } from '../core/format.js';
import { initShell } from '../core/shell.js';
import { getProfile, profileCompleteness } from '../core/store.js';
import { currentUser } from '../core/auth.js';
import { icon } from '../components/icons.js';

initShell();

const user = currentUser();
const profile = user ? getProfile(user.id) : null;

const state = { prep: [], companies: [], jobs: [], domain: null, current: null };

const STATUS = {
  open:     ['ok',    'Open now'],
  rolling:  ['blue',  'Rolling'],
  upcoming: ['warn',  'Upcoming'],
  closed:   ['stop',  'Closed']
};

/* -------------------------------------------------------------- Pieces */

const readinessCard = (entry) => {
  if (!user) {
    return `
      <div class="card">
        <p class="tick">Your readiness</p>
        <p style="font-size:var(--t-sm);color:var(--ink-2);margin:var(--s3) 0 var(--s4)">
          Sign in and add your skills, and this panel scores them against what this
          loop actually weights.
        </p>
        <a class="btn btn--outline btn--block btn--sm"
           href="./auth.html?next=${encodeURIComponent(`prep.html?company=${entry.companyId}`)}">Sign in</a>
      </div>`;
  }

  if (!profile.skills.length) {
    return `
      <div class="card">
        <p class="tick">Your readiness</p>
        <p style="font-size:var(--t-sm);color:var(--ink-2);margin:var(--s3) 0 var(--s4)">
          Add a few skills to your profile and they get matched against the focus areas
          below. Your profile is ${profileCompleteness(profile)}% filled in.
        </p>
        <a class="btn btn--outline btn--block btn--sm" href="./profile.html">Add your skills</a>
      </div>`;
  }

  const { score, covered, gaps } = readinessFor(entry, profile);

  return `
    <div class="card">
      <p class="tick">Your readiness</p>

      <div class="row row--split" style="margin:var(--s3) 0 5px;align-items:baseline">
        <span style="font-size:var(--t-sm);color:var(--ink-2)">
          ${covered.length} of ${entry.focus.length} focus areas covered
        </span>
        <span class="figure">${score}%</span>
      </div>

      <div class="meter meter--flag"><div class="meter-fill" style="--v:${score}%"></div></div>

      ${gaps.length ? `
        <p style="font-size:var(--t-sm);color:var(--ink-2);margin-top:var(--s4)">
          Biggest gap: <strong>${esc(gaps.sort((a, b) => b.weight - a.weight)[0].topic)}</strong>.
        </p>` : `
        <p style="font-size:var(--t-sm);color:var(--ok);margin-top:var(--s4)">
          Your skills touch every focus area in this loop.
        </p>`}

      <a class="btn btn--outline btn--block btn--sm" href="./profile.html"
         style="margin-top:var(--s4)">Update your skills</a>
    </div>`;
};

const openingCard = (opening) => {
  const [tone, label] = STATUS[opening.status] || STATUS.rolling;

  return `
    <article class="opening">
      <div>
        <div class="row row--tight" style="margin-bottom:var(--s2)">
          <span class="pill">${esc(opening.kind)}</span>
          <span class="pill pill--${tone} pill--dot">${esc(label)}</span>
        </div>
        <p class="opening-name">${esc(opening.name)}</p>
        <p class="opening-detail">${esc(opening.detail)}</p>
      </div>

      <div class="opening-side">
        <div>
          <p class="tick">When</p>
          <p style="font-size:var(--t-sm);margin-top:3px">${esc(opening.window)}</p>
        </div>
        <div>
          <p class="tick">Who can apply</p>
          <p style="font-size:var(--t-sm);margin-top:3px;color:var(--ink-2)">${esc(opening.eligibility)}</p>
        </div>
      </div>
    </article>`;
};

/* -------------------------------------------------------------- Render */

const render = () => {
  const entry = state.current;
  const company = state.companies.find((c) => c.id === entry.companyId);
  const open = jobsAtCompany(state.jobs, company.id);

  document.title = `How to get into ${company.name} — Nexjob`;

  $$('#prep-picker .prep-pick').forEach((button) =>
    button.setAttribute('aria-pressed', String(button.dataset.company === entry.companyId)));

  $('#prep-main').innerHTML = `
    <div class="card">
      <div class="co-hero">
        <span class="mark mark--lg" aria-hidden="true"
              style="background:${escAttr(company.brandBg)};color:${escAttr(company.brandFg)}">${esc(company.initial)}</span>

        <div style="min-width:0;flex:1 1 260px">
          <h2 style="font-size:var(--t-xl)">Getting into ${esc(company.name)}</h2>
          <p class="tick" style="margin-top:var(--s2)">
            ${esc(entry.loopWeeks)} weeks · ${entry.stages.length} stages · ${plural(open.length, 'open role')}
          </p>
        </div>
      </div>

      <p style="margin-top:var(--s6);color:var(--ink-2);font-size:var(--t-sm);line-height:1.6">
        ${esc(entry.route)}
      </p>
    </div>

    <!-- The loop is a real sequence, so it earns its numbering. -->
    <section class="card" style="margin-top:var(--s4)" aria-labelledby="loop-title">
      <h2 id="loop-title" style="font-size:var(--t-lg);margin-bottom:var(--s5)">The loop, stage by stage</h2>

      <ol class="steps">
        ${entry.stages.map((stage) => `
          <li class="step">
            <div class="step-body">
              <div class="row row--split" style="align-items:baseline">
                <p class="step-title">${esc(stage.name)}</p>
                <span class="tick">${esc(stage.typical)}</span>
              </div>
              <p class="step-detail">${esc(stage.detail)}</p>
            </div>
          </li>`).join('')}
      </ol>
    </section>

    <section class="card" style="margin-top:var(--s4)" aria-labelledby="focus-title">
      <h2 id="focus-title" style="font-size:var(--t-lg)">What the loop weights</h2>
      <p style="font-size:var(--t-sm);color:var(--ink-2);margin:var(--s2) 0 var(--s5)">
        Heavier bars decide more of the outcome. Prepare from the top down.
      </p>

      <div class="stack">
        ${entry.focus.map((area) => `
          <div class="focus-row">
            <div class="focus-row-head">
              <span class="focus-row-topic">${esc(area.topic)}</span>
              <span class="figure" style="font-size:var(--t-xs)">${area.weight}</span>
            </div>
            <div class="meter"><div class="meter-fill" style="--v:${area.weight}%"></div></div>
            <p class="focus-row-note">${esc(area.note)}</p>
          </div>`).join('')}
      </div>
    </section>

    <section class="card" style="margin-top:var(--s4)" aria-labelledby="signals-title">
      <h2 id="signals-title" style="font-size:var(--t-lg);margin-bottom:var(--s4)">What makes an application stand out</h2>
      <ul class="bullets">
        ${entry.signals.map((signal) => `<li>${esc(signal)}</li>`).join('')}
      </ul>
    </section>

    <section style="margin-top:var(--s8)" aria-labelledby="intake-title">
      <div class="sec-head">
        <div>
          <h2 id="intake-title">Intakes and assessments</h2>
          <p>Internships, programmes and tests ${esc(company.name)} runs.</p>
        </div>
      </div>

      <div class="stack">${entry.openings.map(openingCard).join('')}</div>
    </section>

    <section class="card" style="margin-top:var(--s8)" aria-labelledby="prepare-title">
      <h2 id="prepare-title" style="font-size:var(--t-lg);margin-bottom:var(--s5)">How to prepare</h2>

      <ol class="steps">
        ${entry.prepare.map((item) => `
          <li class="step">
            <div class="step-body">
              <p class="step-title">${esc(item.label)}</p>
              <p class="step-detail">${esc(item.detail)}</p>
            </div>
          </li>`).join('')}
      </ol>
    </section>`;

  /* ------------------------------------------------------------ Rail */

  const bandNote = open.length
    ? `${money(Math.min(...open.map((j) => j.salaryMin)))} – ${money(Math.max(...open.map((j) => j.salaryMax)))}`
    : '—';

  const openIntakes = entry.openings.filter((o) => o.status === 'open').length;
  const harder = state.prep.filter((p) => p.bar > entry.bar).length;

  $('#prep-rail').innerHTML = `
    <div class="rail-sticky stack">
      <div class="card">
        <p class="tick">Hiring bar</p>
        <div class="row row--split" style="margin:var(--s3) 0 5px;align-items:baseline">
          <span style="font-size:var(--t-sm);color:var(--ink-2)">
            ${harder === 0 ? 'The highest bar here' : `${harder} ${harder === 1 ? 'company is' : 'companies are'} harder`}
          </span>
          <span class="figure">${entry.bar}/100</span>
        </div>
        <div class="meter meter--lg"><div class="meter-fill" style="--v:${entry.bar}%"></div></div>

        <dl class="co-facts" style="margin-top:var(--s5);grid-template-columns:repeat(2,1fr)">
          <div class="co-fact"><dt class="tick">Loop</dt><dd class="co-fact-value">${esc(entry.loopWeeks)} wks</dd></div>
          <div class="co-fact"><dt class="tick">Stages</dt><dd class="co-fact-value">${entry.stages.length}</dd></div>
          <div class="co-fact"><dt class="tick">Open intakes</dt><dd class="co-fact-value">${openIntakes}</dd></div>
          <div class="co-fact"><dt class="tick">Pay band</dt><dd class="co-fact-value">${esc(bandNote)}</dd></div>
        </dl>
      </div>

      ${readinessCard(entry)}

      <div class="card">
        <p class="tick">At ${esc(company.name)}</p>
        <p style="font-size:var(--t-sm);color:var(--ink-2);margin:var(--s3) 0 var(--s4)">${esc(company.tagline || '')}</p>
        <div class="stack-2">
          <a class="btn btn--primary btn--block btn--sm" href="${url('jobs.html', { company: company.id })}">
            ${plural(open.length, 'open role')}
          </a>
          <a class="btn btn--outline btn--block btn--sm" href="${url('company.html', { id: company.id })}">
            Company profile
          </a>
        </div>
      </div>
    </div>`;
};

/* ---------------------------------------------------------------- Boot */

const boot = async () => {
  const { jobs, companies, prep, domain } = await load();
  Object.assign(state, { jobs, companies, prep, domain });

  const ordered = [...prep].sort((a, b) => b.bar - a.bar);

  $('#prep-picker').innerHTML = ordered.map((entry) => {
    const company = companies.find((c) => c.id === entry.companyId);
    return `
      <button type="button" class="prep-pick" data-company="${esc(entry.companyId)}" aria-pressed="false">
        <span class="mark mark--sm" aria-hidden="true"
              style="background:${escAttr(company.brandBg)};color:${escAttr(company.brandFg)}">${esc(company.initial)}</span>
        ${esc(company.name)}
        <span class="tick">${entry.bar}</span>
      </button>`;
  }).join('');

  const wanted = query().company;
  state.current = prepFor(prep, wanted) || ordered[0];
  render();
};

delegate(document, 'click', '[data-company]', (event, button) => {
  const entry = prepFor(state.prep, button.dataset.company);
  if (!entry) return;

  state.current = entry;
  setQuery({ company: entry.companyId }, true);
  render();
  window.scrollTo({ top: $('#prep-main').offsetTop - 120, behavior: 'smooth' });
});

window.addEventListener('popstate', () => {
  const entry = prepFor(state.prep, query().company);
  if (entry) { state.current = entry; render(); }
});

boot().catch((error) => {
  console.error(error);
  $('#prep-main').innerHTML = `
    <div class="empty">
      <h3>The routes did not load</h3>
      <p>This page reads its data over HTTP, so it needs to be served rather than opened
         from the file system.</p>
      <code>python -m http.server 8000</code>
    </div>`;
});
