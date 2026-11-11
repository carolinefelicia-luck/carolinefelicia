// Training data only; no rover telemetry or mission commands are connected.
export const TRAINING_EVENTS = [
  { id: 'arrival-delay', title: 'Arrival delayed', delayHours: 24 },
  { id: 'activity-delay', title: 'Activity takes longer', delayHours: 4 },
  { id: 'communications-gap', title: 'Simulated communications interruption', delayHours: 2 },
];

export function newTrainingRun() {
  return { events: [], arrivalDelayHours: 0, scheduleDelayHours: 0 };
}

export function applyTrainingEvent(run, eventId, response) {
  const event = TRAINING_EVENTS.find(item => item.id === eventId);
  if (!event || !['continue', 'delay', 'contingency'].includes(response)) throw Error('Invalid training event or response');
  if (run.events.some(item => item.id === eventId)) throw Error('Training event already applied');
  const delay = event.id === 'arrival-delay' || response !== 'continue' ? event.delayHours : 0;
  return {
    events: [...run.events, { id: event.id, title: event.title, response, delayHours: delay, origin: 'Simulated' }],
    arrivalDelayHours: run.arrivalDelayHours + (event.id === 'arrival-delay' ? event.delayHours : 0),
    scheduleDelayHours: run.scheduleDelayHours + delay,
  };
}

export function scheduleConflicts(activities) {
  const conflicts = [];
  for (let i = 0; i < activities.length; i++) {
    const a = activities[i];
    if (!Number.isFinite(a.start) || a.start < 0 || !Number.isFinite(a.duration) || a.duration <= 0) {
      conflicts.push(`Invalid time for ${a.name}`);
      continue;
    }
    for (let j = 0; j < i; j++) {
      const b = activities[j];
      if (a.start < b.start + b.duration && b.start < a.start + a.duration) conflicts.push(`${a.name} overlaps ${b.name}`);
    }
    if (a.after) {
      const dependency = activities.find(item => item.id === a.after);
      if (!dependency || dependency.start + dependency.duration > a.start) conflicts.push(`${a.name} has an unmet dependency`);
      const seen = new Set([a.id]);
      let next = dependency;
      while (next) {
        if (seen.has(next.id)) { conflicts.push(`${a.name} has a circular dependency`); break; }
        seen.add(next.id);
        next = next.after ? activities.find(item => item.id === next.after) : null;
      }
    }
  }
  return conflicts;
}

// These offsets are a deterministic training scenario, not engineering predictions.
export function applyEventToSchedule(activities, eventId, response) {
  const result = activities.map(activity => ({...activity}));
  if (eventId === 'arrival-delay') for (const activity of result) activity.start += 24;
  if (eventId === 'activity-delay' && result.length) {
    result[0].duration += 4;
    if (response !== 'continue') for (const activity of result.slice(1)) activity.start += 4;
    if (response === 'contingency' && result.length > 1) result.at(-1).duration = Math.max(1, result.at(-1).duration - 1);
  }
  if (eventId === 'communications-gap' && response !== 'continue' && result.length) result.at(-1).start += 2;
  return result;
}
