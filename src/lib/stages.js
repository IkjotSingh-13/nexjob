/** The hiring pipeline, in order. Position on this track is the whole point. */
export const STAGES = [
  { id: 'applied',   label: 'Applied' },
  { id: 'screening', label: 'Screening' },
  { id: 'interview', label: 'Interview' },
  { id: 'offer',     label: 'Offer' }
];

export const CLOSED_STAGE = { id: 'closed', label: 'Not moving forward' };

export const stageIndex = (id) => STAGES.findIndex((s) => s.id === id);

export const stageLabel = (id) =>
  (id === CLOSED_STAGE.id ? CLOSED_STAGE : STAGES.find((s) => s.id === id))?.label ?? 'Applied';
