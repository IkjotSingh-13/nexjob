/**
 * The application pipeline.
 *
 * The same grammar as the pay scale, applied to a second domain. Pay is a
 * position on a salary range; an application is a position on a hiring
 * process. Both are a track, a marker, and a label — which is why the two
 * read as one product rather than two features.
 */

import { esc } from '../core/dom.js';
import { STAGES, CLOSED_STAGE, stageIndex, stageLabel } from '../core/store.js';

/**
 * @param {string} stage  a stage id, or 'closed'
 */
export const pipeline = (stage) => {
  const closed = stage === CLOSED_STAGE.id;
  const current = closed ? STAGES.length : stageIndex(stage);

  return `
    <ol class="pipe" role="list"
        aria-label="Application stage: ${esc(closed ? CLOSED_STAGE.label : stageLabel(stage))}">
      ${STAGES.map((step, i) => {
        const state = closed ? (i <= 0 ? 'is-done' : '')
          : i < current ? 'is-done'
          : i === current ? 'is-now'
          : '';

        return `
          <li class="pipe-step ${state}">
            <span class="pipe-dot" aria-hidden="true"></span>
            <span class="pipe-label">${esc(step.label)}</span>
          </li>`;
      }).join('')}

      ${closed ? `
        <li class="pipe-step is-out">
          <span class="pipe-dot" aria-hidden="true"></span>
          <span class="pipe-label">Closed</span>
        </li>` : ''}
    </ol>`;
};

/** Stage picker, for the employer moving someone along. */
export const stagePicker = (applicationId, stage) => `
  <span class="select-wrap">
    <select class="select" data-stage-for="${esc(applicationId)}" aria-label="Application stage"
            style="padding-block:7px">
      ${[...STAGES, CLOSED_STAGE].map((option) => `
        <option value="${option.id}" ${option.id === stage ? 'selected' : ''}>${option.label}</option>`).join('')}
    </select>
  </span>`;

/** How the stage should be coloured wherever it appears as a pill. */
export const stageTone = (stage) => {
  if (stage === CLOSED_STAGE.id) return 'stop';
  if (stage === 'offer') return 'ok';
  if (stage === 'applied') return 'blue';
  return 'flag';
};
