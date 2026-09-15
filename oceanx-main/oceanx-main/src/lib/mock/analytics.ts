import type { AnalyticsSeries } from '../types';
import { isoOffset, round, seededRandom } from '../utils';
import { INCIDENTS } from './incidents';
import { MET_OCEAN_HISTORY } from './environment';

const rnd = seededRandom(2026);

const spillAreaOverTime = Array.from({ length: 30 }, (_, i) => {
  const wave = Math.sin((i / 30) * Math.PI * 3);
  return {
    date: isoOffset(-(29 - i) * 1440).slice(0, 10),
    areaKm2: round(18 + wave * 9 + rnd() * 6, 2),
    incidents: Math.max(0, Math.round(2 + wave * 1.6 + rnd() * 1.4))
  };
});

const confidenceDistribution = [
  { bucket: '0.0-0.2', count: 4 },
  { bucket: '0.2-0.4', count: 11 },
  { bucket: '0.4-0.6', count: 23 },
  { bucket: '0.6-0.8', count: 46 },
  { bucket: '0.8-0.9', count: 38 },
  { bucket: '0.9-1.0', count: 27 }
];

const incidentsByRegion = [
  { region: 'Arabian Sea', incidents: 42, areaKm2: 318.4 },
  { region: 'Gulf of Kutch', incidents: 27, areaKm2: 196.2 },
  { region: 'Bay of Bengal', incidents: 31, areaKm2: 241.8 },
  { region: 'Laccadive Sea', incidents: 14, areaKm2: 86.5 },
  { region: 'Andaman Sea', incidents: 8, areaKm2: 47.1 }
];

const detectionAccuracy = Array.from({ length: 12 }, (_, i) => ({
  date: isoOffset(-(11 - i) * 7 * 1440).slice(0, 10),
  truePositives: Math.round(16 + i * 1.4 + rnd() * 3),
  falsePositives: Math.max(1, Math.round(9 - i * 0.5 + rnd() * 2))
}));

const windCurrentConditions = MET_OCEAN_HISTORY.filter((_, i) => i % 2 === 0).map((h) => ({
  hour: h.hour,
  windMs: h.windMs,
  currentMs: h.currentMs,
  waveM: h.waveM
}));

const topSuspect = INCIDENTS[0].suspects[0];

const vesselSpeedProfile = topSuspect.speedSeries.map((p) => ({
  t: p.t,
  suspect: p.speedKn,
  fleetMedian: round(11.6 + Math.sin(new Date(p.t).getUTCHours() / 3) * 0.9, 1)
}));

const vesselCourseProfile = topSuspect.speedSeries.map((p) => ({
  t: p.t,
  suspect: p.courseDeg,
  expected: 288
}));

const driftForecastSpread = INCIDENTS[0].forecast.map((f) => ({
  horizon: `+${f.horizonHours}h`,
  areaKm2: f.areaKm2,
  uncertaintyKm2: round(f.areaKm2 * (1.4 - f.confidence), 2)
}));

const topRankedVessels = INCIDENTS.flatMap((i) => i.suspects)
  .sort((a, b) => b.responsibilityScore - a.responsibilityScore)
  .slice(0, 8)
  .map((s) => ({ name: s.name, score: s.responsibilityScore }));

export const ANALYTICS: AnalyticsSeries = {
  spillAreaOverTime,
  confidenceDistribution,
  incidentsByRegion,
  detectionAccuracy,
  windCurrentConditions,
  vesselSpeedProfile,
  vesselCourseProfile,
  driftForecastSpread,
  topRankedVessels
};

export const ANALYTICS_KPIS = [
  { label: 'Detections (30 d)', value: '149', delta: 12.4, hint: 'vs previous 30 days' },
  { label: 'Confirmed spills', value: '96', delta: 8.1, hint: '64% confirmation rate' },
  { label: 'Mean detection confidence', value: '0.78', delta: 3.2, hint: 'all candidates' },
  { label: 'Attribution rate', value: '71%', delta: 5.6, hint: 'incidents with a ranked suspect' },
  { label: 'Median time to attribution', value: '27 min', delta: -14.2, hint: 'detection to ranked list' },
  { label: 'False positive rate', value: '9.4%', delta: -2.8, hint: 'post-review' }
];
