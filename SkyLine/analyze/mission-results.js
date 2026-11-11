const EPSILON = 1e-6;
const weights = {
  balanced: [0.28, 0.28, 0.25, 0.19],
  solar: [0.45, 0.19, 0.19, 0.17],
  comms: [0.17, 0.45, 0.19, 0.19]
};

export function alignedIntervals(sunIntervals, earthIntervals) {
  let sunIndex = 0, earthIndex = 0;
  const result = [];
  while (sunIndex < sunIntervals.length && earthIndex < earthIntervals.length) {
    const sun = sunIntervals[sunIndex], earth = earthIntervals[earthIndex];
    const sunEnd = sun.time + sun.hours * 3600000;
    const earthEnd = earth.time + earth.hours * 3600000;
    const start = Math.max(sun.time, earth.time);
    const end = Math.min(sunEnd, earthEnd);
    if (end > start) result.push({ time:start, hours:(end-start)/3600000, on:sun.on && earth.on });
    if (sunEnd <= earthEnd) sunIndex++;
    if (earthEnd <= sunEnd) earthIndex++;
  }
  return result;
}

export function alignedVisibility(sunIntervals, earthIntervals, durationHours) {
  const bothHours = alignedIntervals(sunIntervals, earthIntervals).filter(interval=>interval.on).reduce((sum,interval)=>sum+interval.hours,0);
  return durationHours > 0 ? bothHours / durationHours * 100 : 0;
}

export function candidateReference(project, index) {
  const value = project.candidates[index];
  if (value !== 'custom') return { value };
  const point = project.customPoints?.[index];
  return { value, lat: point?.lat, lon: point?.lon };
}

export function hasCurrentResult(project) {
  const screening = project?.screening;
  if (!screening || screening.origin !== 'Horizons' || screening.candidates?.length !== 2 || project.dirty) return false;
  const matchesWindow = (value, localDate) => {
    const time = Date.parse(`${localDate}:00Z`);
    return Number.isFinite(time) && value === new Date(time).toISOString();
  };
  if (!matchesWindow(screening.start, project.start) || !matchesWindow(screening.end, project.end) || screening.sampleHours !== project.sampleHours) return false;
  const validMetric = metric => Number.isFinite(metric?.percent) && Number.isFinite(metric?.longest) && Array.isArray(metric.intervals) && metric.intervals.every(interval => Number.isFinite(interval.time) && Number.isFinite(interval.hours) && interval.hours > 0 && typeof interval.on === 'boolean');
  if (!screening.candidates.every(candidate => validMetric(candidate.sun) && validMetric(candidate.earth))) return false;
  return screening.candidateRefs?.length === 2 && screening.candidateRefs.every((ref, index) => {
    const current = candidateReference(project, index);
    return ref.value === current.value && (ref.value !== 'custom' || (ref.lat === current.lat && ref.lon === current.lon));
  });
}

function describe(candidate) {
  const metrics = candidate.metrics;
  return `Sun ${metrics.sun.toFixed(1)}%, Earth ${metrics.earth.toFixed(1)}%, both ${metrics.both.toFixed(1)}%, longest darkness ${metrics.darkHours.toFixed(1)} h.`;
}

function metricsFor(candidate, durationHours, constraints, priority) {
  const metrics = {
    sun: candidate.sun.percent,
    darkHours: candidate.sun.longest,
    earth: candidate.earth.percent,
    both: alignedVisibility(candidate.sun.intervals, candidate.earth.intervals, durationHours)
  };
  const unmet = [];
  if (metrics.sun + EPSILON < constraints.minSunPercent) unmet.push(`Sun visibility ${metrics.sun.toFixed(1)}% is below ${constraints.minSunPercent}%`);
  if (metrics.darkHours - EPSILON > constraints.maxDarkHours) unmet.push(`Longest darkness ${metrics.darkHours.toFixed(1)} h exceeds ${constraints.maxDarkHours} h`);
  if (metrics.earth + EPSILON < constraints.minEarthPercent) unmet.push(`Direct Earth visibility ${metrics.earth.toFixed(1)}% is below ${constraints.minEarthPercent}%`);
  const darknessScore = durationHours > 0 ? Math.max(0, Math.min(100, 100 * (1 - metrics.darkHours / durationHours))) : 0;
  const factors = [metrics.sun, metrics.earth, metrics.both, darknessScore];
  const score = weights[priority].reduce((sum, weight, index) => sum + weight * factors[index], 0);
  return { ...metrics, meets: unmet.length === 0, constraintsMet: 3 - unmet.length, unmet, score };
}

export function evaluateMission(project) {
  if (!hasCurrentResult(project)) return null;
  const durationHours = (Date.parse(project.end + ':00Z') - Date.parse(project.start + ':00Z')) / 3600000;
  const candidates = project.screening.candidates.map(candidate => ({
    ...candidate,
    metrics: metricsFor(candidate, durationHours, project.constraints, project.priority)
  }));
  const eligible = candidates.filter(candidate => candidate.metrics.meets);
  const ranked = [...candidates].sort((a, b) => b.metrics.constraintsMet - a.metrics.constraintsMet || b.metrics.score - a.metrics.score);
  const scoreKey = score => score.toFixed(1);
  let verdict;
  if (eligible.length === 1) {
    const winner = eligible[0], other = candidates.find(candidate => candidate !== winner);
    verdict = { kind: 'recommend', site: winner, title: `Shortlist Site ${winner.letter}`, why: `Site ${winner.letter} (${winner.name}) meets all three mission constraints (${winner.metrics.score.toFixed(1)}/100). ${describe(winner)} Site ${other.letter} (${other.name}) misses: ${other.metrics.unmet.join('; ')}.` };
  } else if (eligible.length === 2) {
    const [a, b] = eligible;
    if (scoreKey(a.metrics.score) === scoreKey(b.metrics.score)) verdict = { kind: 'tie', site: null, title: 'Both sites meet mission constraints', why: `Scores tie at ${a.metrics.score.toFixed(1)}/100 to displayed precision; no single site is prioritized. A: ${describe(a)} B: ${describe(b)}` };
    else {
      const winner = a.metrics.score > b.metrics.score ? a : b, other = winner === a ? b : a;
      verdict = { kind: 'recommend', site: winner, title: `Shortlist Site ${winner.letter}`, why: `Both sites meet all three constraints. Site ${winner.letter} (${winner.name}) has higher ${project.priority === 'balanced' ? 'balanced' : project.priority === 'solar' ? 'solar power' : 'Earth communications'} weighted score (${winner.metrics.score.toFixed(1)} vs ${other.metrics.score.toFixed(1)}/100). ${describe(winner)}` };
    }
  } else {
    const [a, b] = ranked;
    if (a.metrics.constraintsMet === b.metrics.constraintsMet && scoreKey(a.metrics.score) === scoreKey(b.metrics.score)) verdict = { kind: 'none', site: null, title: 'Neither meets mission constraints', why: `Best near-miss is a tie: Sites A (${a.name}) and B (${b.name}) each meet ${a.metrics.constraintsMet}/3 constraints at ${a.metrics.score.toFixed(1)}/100. A misses: ${a.metrics.unmet.join('; ') || 'none'}. B misses: ${b.metrics.unmet.join('; ') || 'none'}.` };
    else verdict = { kind: 'none', site: a, title: 'Neither meets mission constraints', why: `Best near-miss: Site ${a.letter} (${a.name}) meets ${a.metrics.constraintsMet}/3 constraints at ${a.metrics.score.toFixed(1)}/100. ${describe(a)} It misses: ${a.metrics.unmet.join('; ')}.` };
  }
  return { candidates, verdict, priority: project.priority };
}
