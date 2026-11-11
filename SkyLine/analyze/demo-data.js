export const DATES = ['2026-11-14', '2026-11-21', '2026-11-28', '2026-12-05'];

export const PRESETS = [
  { id: 'shackleton', name: 'Shackleton Rim', lat: -89.2, lon: 0,
    description: 'A ridge near the lunar south pole, surrounded by dramatic crater terrain.',
    sun: [72,61,79,66], earth: [58,65,54,71], dark: [38,54,27,45], gap: [24,19,31,16],
    skyline: 'M0 165 L37 148 L88 158 L129 89 L177 121 L222 100 L267 153 L314 124 L369 142 L420 119 L420 230 L0 230Z' },
  { id: 'gerlache', name: 'de Gerlache Rim', lat: -88.5, lon: -87,
    description: 'A crater-edge candidate where local slopes can shape the visible horizon.',
    sun: [64,69,58,74], earth: [79,72,81,65], dark: [52,43,59,32], gap: [12,16,11,22],
    skyline: 'M0 139 L44 157 L86 119 L124 130 L175 87 L218 118 L263 106 L298 162 L354 124 L420 139 L420 230 L0 230Z' },
  { id: 'malapert', name: 'Malapert Massif', lat: -85.99, lon: 2,
    description: 'An elevated lunar south-pole area with a different terrain and visibility profile.',
    sun: [82,76,69,73], earth: [48,53,61,57], dark: [21,28,42,34], gap: [43,37,28,31],
    skyline: 'M0 174 L48 140 L98 113 L143 143 L184 93 L243 124 L292 73 L334 122 L383 102 L420 130 L420 230 L0 230Z' }
];

function hash(text) {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}

function sequence(percent, shift) {
  const scores = Array.from({ length: 28 }, (_, i) => ({ i, score: Math.sin((i+shift)*.47) + .52*Math.cos((i+shift)*.23) + .27*Math.sin((i+shift)*1.13) }));
  const visible = new Set([...scores].sort((a,b) => b.score-a.score).slice(0, Math.round(percent*28/100)).map(day => day.i));
  return scores.map(day => visible.has(day.i));
}

function candidateResult(candidate, dateIndex) {
  const presetIndex = PRESETS.findIndex(site => site.id === candidate.id);
  const preset = PRESETS[presetIndex];
  const lat = Number(candidate.lat), lon = Number(candidate.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new RangeError('Enter latitude from −90 to 90 and longitude from −180 to 180.');
  }
  const position = { lat: Number(lat.toFixed(4)), lon: Number((lon === 180 ? -180 : lon).toFixed(4)) };
  const seed = hash(`${position.lat.toFixed(4)},${position.lon.toFixed(4)}:${dateIndex}`);
  const metrics = preset
    ? Object.fromEntries(['sun','earth','dark','gap'].map(key => [key, preset[key][dateIndex]]))
    : { sun: 40+seed%46, earth: 25+(seed>>>5)%66, dark: 20+(seed>>>11)%56, gap: 10+(seed>>>17)%56 };
  const shift = (preset ? presetIndex*2.2 : (seed%1000)/100) + dateIndex*1.65;
  return {
    id: preset?.id ?? 'custom', name: preset?.name ?? 'Custom location', ...position,
    source: 'synthetic', locationType: preset ? 'approximate-demo-anchor' : 'user-selected',
    metrics, timeline: { sun: sequence(metrics.sun, shift), earth: sequence(metrics.earth, shift+3.6) },
    skyline: preset?.skyline ?? PRESETS[seed%PRESETS.length].skyline
  };
}

// Replace this provider when mission calculations become available. No scene or DOM work belongs here.
export function getComparison({ candidateA, candidateB, dateIndex, relayCount }) {
  if (!Number.isInteger(dateIndex) || dateIndex < 0 || dateIndex >= DATES.length) throw new RangeError('Choose one of the four demo dates.');
  if (!Number.isInteger(relayCount) || relayCount < 0 || relayCount > 2) throw new RangeError('Choose zero, one, or two demo relays.');
  const a = candidateResult(candidateA, dateIndex), b = candidateResult(candidateB, dateIndex);
  return { source: 'synthetic', startDate: DATES[dateIndex], windowDays: 28, a, b,
    relay: { count: relayCount, coverage: Math.min(98, a.metrics.earth + [0,18,29][relayCount]) } };
}
