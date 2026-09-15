import type { SatelliteScene } from '../types';
import { circleRing, DEMO_NOW, isoOffset, round } from '../utils';

interface SceneSeed {
  id: string;
  mission: string;
  sensor: string;
  mode: string;
  polarisation: string;
  minutesAgo: number;
  resolutionM: number;
  incidenceAngleDeg: number;
  cloudCoverPct: number;
  center: [number, number];
  swathKm: number;
  orbit: number;
  passDirection: 'ascending' | 'descending';
  stage: SatelliteScene['processingStage'];
  sizeMb: number;
  region: string;
  incidentId?: string;
}

const SEEDS: SceneSeed[] = [
  {
    id: 'S1A-IW-20260912T0806',
    mission: 'Sentinel-1A',
    sensor: 'C-SAR',
    mode: 'IW GRDH',
    polarisation: 'VV+VH',
    minutesAgo: 94,
    resolutionM: 10,
    incidenceAngleDeg: 38.4,
    cloudCoverPct: 0,
    center: [19.42, 71.6],
    swathKm: 250,
    orbit: 41822,
    passDirection: 'descending',
    stage: 'complete',
    sizeMb: 1684,
    region: 'Arabian Sea \u00b7 Mumbai High',
    incidentId: 'INC-2026-0142'
  },
  {
    id: 'S1A-IW-20260912T0552',
    mission: 'Sentinel-1A',
    sensor: 'C-SAR',
    mode: 'IW GRDH',
    polarisation: 'VV+VH',
    minutesAgo: 248,
    resolutionM: 10,
    incidenceAngleDeg: 34.1,
    cloudCoverPct: 0,
    center: [22.28, 68.95],
    swathKm: 250,
    orbit: 41821,
    passDirection: 'descending',
    stage: 'complete',
    sizeMb: 1612,
    region: 'Gulf of Kutch \u00b7 Vadinar',
    incidentId: 'INC-2026-0141'
  },
  {
    id: 'S1A-IW-20260912T0248',
    mission: 'Sentinel-1A',
    sensor: 'C-SAR',
    mode: 'IW GRDH',
    polarisation: 'VV',
    minutesAgo: 432,
    resolutionM: 10,
    incidenceAngleDeg: 41.2,
    cloudCoverPct: 0,
    center: [20.15, 86.92],
    swathKm: 250,
    orbit: 41818,
    passDirection: 'ascending',
    stage: 'complete',
    sizeMb: 1731,
    region: 'Bay of Bengal \u00b7 Paradip',
    incidentId: 'INC-2026-0137'
  },
  {
    id: 'S1B-IW-20260911T2214',
    mission: 'Sentinel-1B',
    sensor: 'C-SAR',
    mode: 'IW GRDH',
    polarisation: 'VV+VH',
    minutesAgo: 706,
    resolutionM: 10,
    incidenceAngleDeg: 36.8,
    cloudCoverPct: 0,
    center: [9.88, 75.72],
    swathKm: 250,
    orbit: 27114,
    passDirection: 'descending',
    stage: 'complete',
    sizeMb: 1588,
    region: 'Laccadive Sea \u00b7 Kochi',
    incidentId: 'INC-2026-0139'
  },
  {
    id: 'S2B-MSI-20260912T0714',
    mission: 'Sentinel-2B',
    sensor: 'MSI',
    mode: 'L2A',
    polarisation: 'n/a (optical)',
    minutesAgo: 146,
    resolutionM: 10,
    incidenceAngleDeg: 8.2,
    cloudCoverPct: 18,
    center: [19.38, 71.52],
    swathKm: 290,
    orbit: 30918,
    passDirection: 'descending',
    stage: 'complete',
    sizeMb: 842,
    region: 'Arabian Sea \u00b7 Mumbai High',
    incidentId: 'INC-2026-0142'
  },
  {
    id: 'S1A-IW-20260912T0918',
    mission: 'Sentinel-1A',
    sensor: 'C-SAR',
    mode: 'IW GRDH',
    polarisation: 'VV+VH',
    minutesAgo: 22,
    resolutionM: 10,
    incidenceAngleDeg: 39.6,
    cloudCoverPct: 0,
    center: [21.05, 70.2],
    swathKm: 250,
    orbit: 41823,
    passDirection: 'descending',
    stage: 'processing',
    sizeMb: 1702,
    region: 'Arabian Sea \u00b7 Saurashtra coast'
  },
  {
    id: 'S1A-IW-20260912T0932',
    mission: 'Sentinel-1A',
    sensor: 'C-SAR',
    mode: 'IW GRDH',
    polarisation: 'VV',
    minutesAgo: 8,
    resolutionM: 10,
    incidenceAngleDeg: 33.4,
    cloudCoverPct: 0,
    center: [17.9, 72.9],
    swathKm: 250,
    orbit: 41823,
    passDirection: 'descending',
    stage: 'queued',
    sizeMb: 1664,
    region: 'Arabian Sea \u00b7 Ratnagiri offshore'
  },
  {
    id: 'S1B-IW-20260911T0402',
    mission: 'Sentinel-1B',
    sensor: 'C-SAR',
    mode: 'IW GRDH',
    polarisation: 'VV+VH',
    minutesAgo: 1598,
    resolutionM: 10,
    incidenceAngleDeg: 30.9,
    cloudCoverPct: 4,
    center: [13.03, 80.52],
    swathKm: 250,
    orbit: 27102,
    passDirection: 'ascending',
    stage: 'complete',
    sizeMb: 1549,
    region: 'Bay of Bengal \u00b7 Chennai',
    incidentId: 'INC-2026-0135'
  },
  {
    id: 'S1A-IW-20260909T0931',
    mission: 'Sentinel-1A',
    sensor: 'C-SAR',
    mode: 'IW GRDH',
    polarisation: 'VV+VH',
    minutesAgo: 4344,
    resolutionM: 10,
    incidenceAngleDeg: 37.1,
    cloudCoverPct: 12,
    center: [21.05, 72.35],
    swathKm: 250,
    orbit: 41779,
    passDirection: 'descending',
    stage: 'complete',
    sizeMb: 1621,
    region: 'Gulf of Khambhat \u00b7 Hazira',
    incidentId: 'INC-2026-0131'
  },
  {
    id: 'RS2-SCN-20260911T1740',
    mission: 'RISAT-2B',
    sensor: 'X-SAR',
    mode: 'Coarse',
    polarisation: 'HH',
    minutesAgo: 964,
    resolutionM: 25,
    incidenceAngleDeg: 44.3,
    cloudCoverPct: 0,
    center: [15.4, 73.4],
    swathKm: 120,
    orbit: 9142,
    passDirection: 'ascending',
    stage: 'failed',
    sizeMb: 612,
    region: 'Arabian Sea \u00b7 Goa offshore'
  }
];

export const SATELLITE_SCENES: SatelliteScene[] = SEEDS.map((s) => ({
  id: s.id,
  mission: s.mission,
  sensor: s.sensor,
  mode: s.mode,
  polarisation: s.polarisation,
  acquiredAt: isoOffset(-s.minutesAgo),
  resolutionM: s.resolutionM,
  incidenceAngleDeg: s.incidenceAngleDeg,
  cloudCoverPct: s.cloudCoverPct,
  footprint: circleRing(s.center, s.swathKm / 3.4, 18),
  center: s.center,
  swathKm: s.swathKm,
  orbit: s.orbit,
  passDirection: s.passDirection,
  processingStage: s.stage,
  sizeMb: s.sizeMb,
  region: s.region,
  detectedIncidentId: s.incidentId
}));

export const SCENE_BY_ID: Record<string, SatelliteScene> = SATELLITE_SCENES.reduce(
  (acc, s) => ({ ...acc, [s.id]: s }),
  {} as Record<string, SatelliteScene>
);

export const LATEST_SCENE = SATELLITE_SCENES.reduce((latest, scene) =>
  new Date(scene.acquiredAt) > new Date(latest.acquiredAt) ? scene : latest
);

export const UPCOMING_PASSES = [
  { mission: 'Sentinel-1A', region: 'Arabian Sea \u00b7 Mumbai High', at: isoOffset(196), mode: 'IW GRDH' },
  { mission: 'Sentinel-2A', region: 'Gulf of Kutch', at: isoOffset(268), mode: 'MSI L2A' },
  { mission: 'Sentinel-1B', region: 'Bay of Bengal \u00b7 Paradip', at: isoOffset(412), mode: 'IW GRDH' },
  { mission: 'RISAT-2B', region: 'Laccadive Sea \u00b7 Kochi', at: isoOffset(604), mode: 'X-SAR Coarse' }
];

export const SCENE_COVERAGE_SUMMARY = {
  scenes24h: SATELLITE_SCENES.filter(
    (s) => new Date(s.acquiredAt).getTime() > DEMO_NOW.getTime() - 1440 * 60_000
  ).length,
  coverageKm2: round(
    SATELLITE_SCENES.reduce((sum, s) => sum + s.swathKm * 180, 0),
    0
  ),
  detectionsFromScenes: SATELLITE_SCENES.filter((s) => s.detectedIncidentId).length
};
