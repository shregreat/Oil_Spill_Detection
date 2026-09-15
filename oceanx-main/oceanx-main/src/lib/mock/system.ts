import type { DataSource, ModelStatus, SystemUser } from '../types';
import { isoOffset, round, seededRandom } from '../utils';

export const DATA_SOURCES: DataSource[] = [
  {
    id: 'copernicus-s1',
    name: 'Copernicus Sentinel-1 SAR',
    category: 'satellite',
    provider: 'ESA / Copernicus Data Space',
    status: 'operational',
    latencyMs: 820,
    uptime30dPct: 99.7,
    lastSyncAt: isoOffset(-6),
    refreshIntervalMin: 30,
    recordsLast24h: 14,
    endpoint: 'odata/v1/Products',
    message: 'Nominal. 14 scenes ingested in the last 24 h.'
  },
  {
    id: 'copernicus-s2',
    name: 'Copernicus Sentinel-2 Optical',
    category: 'satellite',
    provider: 'ESA / Copernicus Data Space',
    status: 'operational',
    latencyMs: 1140,
    uptime30dPct: 99.2,
    lastSyncAt: isoOffset(-18),
    refreshIntervalMin: 60,
    recordsLast24h: 6,
    endpoint: 'odata/v1/Products',
    message: 'Nominal. Optical cross-check available for daylight passes.'
  },
  {
    id: 'risat',
    name: 'RISAT-2B X-SAR',
    category: 'satellite',
    provider: 'ISRO Bhoonidhi',
    status: 'degraded',
    latencyMs: 4300,
    uptime30dPct: 93.4,
    lastSyncAt: isoOffset(-964),
    refreshIntervalMin: 180,
    recordsLast24h: 1,
    endpoint: 'bhoonidhi/api/scenes',
    message: 'Last ingest failed checksum validation. Provider ticket open.'
  },
  {
    id: 'ais-sat',
    name: 'Satellite AIS Feed',
    category: 'ais',
    provider: 'Exact Earth (S-AIS)',
    status: 'operational',
    latencyMs: 2600,
    uptime30dPct: 99.9,
    lastSyncAt: isoOffset(-1),
    refreshIntervalMin: 2,
    recordsLast24h: 1_842_400,
    endpoint: 'stream/v2/positions',
    message: 'Nominal. 1.84 M position reports in the last 24 h.'
  },
  {
    id: 'ais-terrestrial',
    name: 'Terrestrial AIS Network',
    category: 'ais',
    provider: 'Indian Coast Guard AIS chain',
    status: 'operational',
    latencyMs: 380,
    uptime30dPct: 98.6,
    lastSyncAt: isoOffset(-1),
    refreshIntervalMin: 1,
    recordsLast24h: 964_200,
    endpoint: 'nmea/tcp/10110',
    message: 'Nominal. Coastal coverage to 40 nm.'
  },
  {
    id: 'ecmwf',
    name: 'ECMWF Atmospheric Forecast',
    category: 'weather',
    provider: 'ECMWF Open Data',
    status: 'operational',
    latencyMs: 1450,
    uptime30dPct: 99.4,
    lastSyncAt: isoOffset(-24),
    refreshIntervalMin: 360,
    recordsLast24h: 4,
    endpoint: 'open-data/v1/forecast',
    message: 'Nominal. 0.25\u00b0 wind and wave fields available to +120 h.'
  },
  {
    id: 'incois',
    name: 'INCOIS Ocean Currents',
    category: 'ocean',
    provider: 'INCOIS',
    status: 'operational',
    latencyMs: 2100,
    uptime30dPct: 97.8,
    lastSyncAt: isoOffset(-42),
    refreshIntervalMin: 180,
    recordsLast24h: 8,
    endpoint: 'las/api/surface-currents',
    message: 'Nominal. Surface current analysis current to 42 min.'
  },
  {
    id: 'cmems',
    name: 'CMEMS Global Ocean Physics',
    category: 'ocean',
    provider: 'Copernicus Marine Service',
    status: 'maintenance',
    latencyMs: 0,
    uptime30dPct: 96.1,
    lastSyncAt: isoOffset(-320),
    refreshIntervalMin: 360,
    recordsLast24h: 2,
    endpoint: 'motu/v1/download',
    message: 'Scheduled provider maintenance window until 14:00 UTC. INCOIS used as fallback.'
  },
  {
    id: 'vessel-registry',
    name: 'Vessel Registry Reference',
    category: 'internal',
    provider: 'OceanX reference store',
    status: 'operational',
    latencyMs: 45,
    uptime30dPct: 100,
    lastSyncAt: isoOffset(-120),
    refreshIntervalMin: 1440,
    recordsLast24h: 21_400,
    endpoint: 'internal/registry/vessels',
    message: 'Nominal. IMO / MMSI cross-reference current.'
  }
];

function metricHistory(seed: number, baseF1: number) {
  const rnd = seededRandom(seed);
  return Array.from({ length: 12 }, (_, i) => {
    const trend = i * 0.004;
    return {
      date: isoOffset(-(11 - i) * 7 * 1440).slice(0, 10),
      f1: round(Math.min(0.99, baseF1 - 0.05 + trend + rnd() * 0.02), 3),
      precision: round(Math.min(0.99, baseF1 - 0.03 + trend + rnd() * 0.02), 3),
      recall: round(Math.min(0.99, baseF1 - 0.07 + trend + rnd() * 0.03), 3)
    };
  });
}

export const MODELS: ModelStatus[] = [
  {
    id: 'oceanx-segformer',
    name: 'OceanX SAR Slick Segmenter',
    task: 'Oil slick semantic segmentation (SAR)',
    version: 'v2.4.1',
    framework: 'PyTorch 2.3 / SegFormer-B3',
    status: 'operational',
    accuracy: 0.951,
    precision: 0.938,
    recall: 0.914,
    f1: 0.926,
    iou: 0.871,
    avgInferenceMs: 1840,
    inferencesLast24h: 142,
    gpuUtilPct: 61,
    lastTrainedAt: isoOffset(-26 * 1440),
    driftScore: 0.08,
    history: metricHistory(11, 0.926)
  },
  {
    id: 'oceanx-lookalike',
    name: 'Lookalike Discriminator',
    task: 'Dark-patch vs oil classification',
    version: 'v1.8.0',
    framework: 'PyTorch 2.3 / ConvNeXt-T',
    status: 'operational',
    accuracy: 0.918,
    precision: 0.902,
    recall: 0.884,
    f1: 0.893,
    avgInferenceMs: 320,
    inferencesLast24h: 408,
    gpuUtilPct: 34,
    lastTrainedAt: isoOffset(-41 * 1440),
    driftScore: 0.14,
    history: metricHistory(23, 0.893)
  },
  {
    id: 'oceanx-drift',
    name: 'Drift Ensemble',
    task: 'Lagrangian hindcast / forecast',
    version: 'v3.1.2',
    framework: 'OpenDrift 1.11 (500-member ensemble)',
    status: 'operational',
    accuracy: 0.874,
    precision: 0.861,
    recall: 0.848,
    f1: 0.854,
    avgInferenceMs: 9400,
    inferencesLast24h: 58,
    gpuUtilPct: 12,
    lastTrainedAt: isoOffset(-90 * 1440),
    driftScore: 0.06,
    history: metricHistory(37, 0.854)
  },
  {
    id: 'oceanx-attribution',
    name: 'Vessel Attribution Ranker',
    task: 'Suspect ranking from AIS + drift evidence',
    version: 'v2.0.4',
    framework: 'XGBoost 2.0 + rule ensemble',
    status: 'degraded',
    accuracy: 0.889,
    precision: 0.874,
    recall: 0.836,
    f1: 0.855,
    avgInferenceMs: 640,
    inferencesLast24h: 96,
    gpuUtilPct: 8,
    lastTrainedAt: isoOffset(-18 * 1440),
    driftScore: 0.21,
    history: metricHistory(53, 0.855)
  },
  {
    id: 'oceanx-anomaly',
    name: 'AIS Behaviour Anomaly Detector',
    task: 'Track anomaly and AIS-gap detection',
    version: 'v1.4.3',
    framework: 'PyTorch 2.3 / Temporal CNN',
    status: 'operational',
    accuracy: 0.902,
    precision: 0.881,
    recall: 0.867,
    f1: 0.874,
    avgInferenceMs: 210,
    inferencesLast24h: 1_240,
    gpuUtilPct: 27,
    lastTrainedAt: isoOffset(-33 * 1440),
    driftScore: 0.11,
    history: metricHistory(71, 0.874)
  }
];

export const SYSTEM_USERS: SystemUser[] = [
  {
    id: 'USR-001',
    name: 'Cdr. Arjun Nair',
    email: 'a.nair@oceanx.gov.in',
    role: 'Administrator',
    organisation: 'Indian Coast Guard \u00b7 MRCC Mumbai',
    status: 'active',
    lastActiveAt: isoOffset(-4),
    mfaEnabled: true,
    incidentsHandled: 148
  },
  {
    id: 'USR-002',
    name: 'Lt. Sneha Iyer',
    email: 's.iyer@oceanx.gov.in',
    role: 'Analyst',
    organisation: 'Indian Coast Guard \u00b7 MRCC Porbandar',
    status: 'active',
    lastActiveAt: isoOffset(-22),
    mfaEnabled: true,
    incidentsHandled: 96
  },
  {
    id: 'USR-003',
    name: 'Lt. Cdr. Pranab Das',
    email: 'p.das@oceanx.gov.in',
    role: 'Analyst',
    organisation: 'Indian Coast Guard \u00b7 MRCC Paradip',
    status: 'active',
    lastActiveAt: isoOffset(-64),
    mfaEnabled: true,
    incidentsHandled: 74
  },
  {
    id: 'USR-004',
    name: 'Rahul Menon',
    email: 'r.menon@incois.gov.in',
    role: 'Operator',
    organisation: 'INCOIS \u00b7 Ocean Services',
    status: 'active',
    lastActiveAt: isoOffset(-186),
    mfaEnabled: false,
    incidentsHandled: 41
  },
  {
    id: 'USR-005',
    name: 'Kavya Rao',
    email: 'k.rao@oceanx.gov.in',
    role: 'Operator',
    organisation: 'Indian Coast Guard \u00b7 MRCC Chennai',
    status: 'active',
    lastActiveAt: isoOffset(-320),
    mfaEnabled: true,
    incidentsHandled: 33
  },
  {
    id: 'USR-006',
    name: 'Dr. Meera Krishnan',
    email: 'm.krishnan@nio.res.in',
    role: 'Viewer',
    organisation: 'National Institute of Oceanography',
    status: 'active',
    lastActiveAt: isoOffset(-1440),
    mfaEnabled: false,
    incidentsHandled: 0
  },
  {
    id: 'USR-007',
    name: 'Vikram Sethi',
    email: 'v.sethi@dgshipping.gov.in',
    role: 'Viewer',
    organisation: 'Directorate General of Shipping',
    status: 'invited',
    lastActiveAt: isoOffset(-2880),
    mfaEnabled: false,
    incidentsHandled: 0
  },
  {
    id: 'USR-008',
    name: 'Imran Qureshi',
    email: 'i.qureshi@contractor.oceanx.in',
    role: 'Operator',
    organisation: 'External contractor',
    status: 'suspended',
    lastActiveAt: isoOffset(-14400),
    mfaEnabled: false,
    incidentsHandled: 12
  }
];

export const PIPELINE_QUEUE = [
  { stage: 'Ingest', queued: 2, running: 1, failed: 0, avgSec: 64 },
  { stage: 'Preprocess', queued: 1, running: 1, failed: 0, avgSec: 128 },
  { stage: 'Segmentation', queued: 1, running: 1, failed: 0, avgSec: 184 },
  { stage: 'Drift', queued: 0, running: 1, failed: 0, avgSec: 412 },
  { stage: 'Attribution', queued: 0, running: 0, failed: 1, avgSec: 96 }
];
