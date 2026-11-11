export function assess(samples, start, end) {
  if (!samples || end <= start) throw Error('Invalid assessment interval');
  const jd = ms => ms / 86400000 + 2440587.5;
  const first = jd(start), last = jd(end);
  if (first < samples[0][0] || last > samples.at(-1)[0]) throw Error('Period outside ephemeris coverage');
  let visible = 0, gap = 0, longest = 0;
  const intervals = [];
  for (let i = 0; i < samples.length - 1; i++) {
    const left = Math.max(first, samples[i][0]), right = Math.min(last, samples[i+1][0]);
    if (right <= left) continue;
    const hours = (right-left)*24, on = samples[i][2] > 0;
    visible += on ? hours : 0;
    gap = on ? 0 : gap + hours; longest = Math.max(longest, gap);
    intervals.push({time:(left-2440587.5)*86400000, hours, on, az:samples[i][1], el:samples[i][2]});
  }
  return {percent:visible/((last-first)*24)*100, longest, intervals};
}
