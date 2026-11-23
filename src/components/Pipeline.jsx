/**
 * An application's place in the hiring process: the same "track and marker"
 * idea as the pay scale, applied to applied → screening → interview → offer.
 */

import { STAGES, CLOSED_STAGE, stageIndex, stageLabel } from '../lib/store.js';

export function Pipeline({ stage }) {
  const closed = stage === CLOSED_STAGE.id;
  const current = stageIndex(stage);

  /* Steps before the current one are done; a closed application only got as far as "Applied". */
  const stateOf = (i) => {
    if (closed) {
      if (i === 0) return 'is-done';
      return '';
    }
    if (i < current) return 'is-done';
    if (i === current) return 'is-now';
    return '';
  };

  return (
    <ol className="pipe" role="list" aria-label={`Application stage: ${stageLabel(stage)}`}>
      {STAGES.map((step, i) => (
        <li className={`pipe-step ${stateOf(i)}`} key={step.id}>
          <span className="pipe-dot" aria-hidden="true" />
          <span className="pipe-label">{step.label}</span>
        </li>
      ))}

      {closed && (
        <li className="pipe-step is-out">
          <span className="pipe-dot" aria-hidden="true" />
          <span className="pipe-label">Closed</span>
        </li>
      )}
    </ol>
  );
}

/** A dropdown for the employer to move someone to another stage. */
export function StagePicker({ stage, onChange }) {
  const options = [...STAGES, CLOSED_STAGE];   // the four stages, then "Not moving forward"

  return (
    <span className="select-wrap">
      <select className="select" aria-label="Application stage" style={{ paddingBlock: 7 }}
              value={stage} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.label}</option>
        ))}
      </select>
    </span>
  );
}

/** The pill colour for a stage. */
export const stageTone = (stage) => {
  if (stage === CLOSED_STAGE.id) return 'stop';
  if (stage === 'offer') return 'ok';
  if (stage === 'applied') return 'blue';
  return 'flag';
};
