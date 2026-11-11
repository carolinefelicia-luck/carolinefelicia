import { evaluateMission } from './mission-results.js?v=20261108c';

export function getRecommendations(project) {
  const evaluation = evaluateMission(project);
  if (!evaluation) return ['Calculate or refresh Result for the current sites, UTC window, and sampling step.'];
  const { title, why } = evaluation.verdict;
  return [`${title}. ${why}`, 'Verify terrain, slope and hazards; power and storage; thermal limits; communications coverage and link budget.'];
}
