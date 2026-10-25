/**
 * The application pipeline.
 *
 * The same grammar as the pay scale, applied to a second domain. Pay is a
 * position on a salary range; an application is a position on a hiring
 * process. Both are a track, a marker, and a label — which is why the two
 * read as one product rather than two features.
 */

import { STAGES, CLOSED_STAGE, stageIndex, stageLabel } from '../lib/stages.js';

/** @param {{stage: string}} props  a stage id, or 'closed' */
export function Pipeline({ stage }) {
  const closed = stage === CLOSED_STAGE.id;
  const current = closed ? STAGES.length : stageIndex(stage);

  return (
    <ol className="pipe" role="list"
        aria-label={`Application stage: ${closed ? CLOSED_STAGE.label : stageLabel(stage)}`}>
      {STAGES.map((step, i) => {
        const state = closed ? (i <= 0 ? 'is-done' : '')
          : i < current ? 'is-done'
          : i === current ? 'is-now'
          : '';

        return (
          <li key={step.id} className={`pipe-step ${state}`}>
            <span className="pipe-dot" aria-hidden="true" />
            <span className="pipe-label">{step.label}</span>
          </li>
        );
      })}

      {closed && (
        <li className="pipe-step is-out">
          <span className="pipe-dot" aria-hidden="true" />
          <span className="pipe-label">Closed</span>
        </li>
      )}
    </ol>
  );
}

/** Stage picker, for the employer moving someone along. */
export function StagePicker({ value, onChange, disabled = false }) {
  return (
    <span className="select-wrap">
      <select className="select" value={value} disabled={disabled} aria-label="Application stage"
              style={{ paddingBlock: 7 }} onChange={(event) => onChange(event.target.value)}>
        {[...STAGES, CLOSED_STAGE].map((option) => (
          <option key={option.id} value={option.id}>{option.label}</option>
        ))}
      </select>
    </span>
  );
}

/** How the stage should be coloured wherever it appears as a pill. */
export const stageTone = (stage) => {
  if (stage === CLOSED_STAGE.id) return 'stop';
  if (stage === 'offer') return 'ok';
  if (stage === 'applied') return 'blue';
  return 'flag';
};
