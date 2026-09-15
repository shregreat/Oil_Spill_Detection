import type {
  AttributionEvidence,
  ForecastStep,
  Incident,
  IncidentStatus,
  LatLng,
  OriginEstimate,
  Severity,
  SlickGeometry,
  SuspectVessel,
  TimelineEvent,
  TimelineStage
} from '../types';
import { bboxOf, blobRing, centroidOf, circleRing, distanceKm, isoOffset, project, round, seededRandom } from '../utils';
import { FORECAST_HORIZONS } from '../constants';
import { REGIONAL_CONDITIONS } from './environment';
import { VESSEL_BY_MMSI } from './vessels';

interface SuspectSeed {
  mmsi: string;
  score: number;
  distanceKm: number;
  timeDiffMin: number;
  correlation: number;
  behaviour: number;
  anomalies: string[];
}

interface IncidentSeed {
  id: string;
  title: string;
  region: keyof typeof REGIONAL_CONDITIONS;
  waterBody: string;
  status: IncidentStatus;
  severity: Severity;
  detectedMinAgo: number;
  center: LatLng;
  radiusKm: number;
  elongation: number;
  orientationDeg: number;
  confidence: number;
  sceneId: string;
  oilClass: string;
  assignedTo: string;
  spreadRate: number;
  volumeM3: number;
  driftDirDeg: number;
  driftSpeedMs: number;
  originAgeMin: number;
  originConfidence: number;
  suspects: SuspectSeed[];
  notes: string;
  lookalikeFlags: string[];
}

const SEEDS: IncidentSeed[] = [
  {
    id: 'INC-2026-0142',
    title: 'Slick west of Mumbai High field',
    region: 'Arabian Sea',
    waterBody: 'Arabian Sea \u00b7 Mumbai High',
    status: 'active',
    severity: 'critical',
    detectedMinAgo: 74,
    center: [19.424, 71.598],
    radiusKm: 3.4,
    elongation: 2.4,
    orientationDeg: 38,
    confidence: 0.94,
    sceneId: 'S1A-IW-20260912T0806',
    oilClass: 'Medium crude (API 28-32)',
    assignedTo: 'Cdr. A. Nair',
    spreadRate: 1.42,
    volumeM3: 385,
    driftDirDeg: 118,
    driftSpeedMs: 0.41,
    originAgeMin: 372,
    originConfidence: 0.87,
    notes:
      'Persistent linear slick consistent with an under-way discharge. Coast Guard Dornier tasked for verification overflight.',
    lookalikeFlags: ['low-wind damping ruled out', 'biogenic film unlikely'],
    suspects: [
      {
        mmsi: '636019887',
        score: 91,
        distanceKm: 2.1,
        timeDiffMin: 18,
        correlation: 0.93,
        behaviour: 0.86,
        anomalies: [
          'AIS gap of 46 min over the slick head',
          'Speed reduced to 6.2 kn outside traffic lane',
          'Course deviation of 23\u00b0 from filed route'
        ]
      },
      {
        mmsi: '419001234',
        score: 64,
        distanceKm: 5.8,
        timeDiffMin: 63,
        correlation: 0.71,
        behaviour: 0.42,
        anomalies: ['Transited slick corridor 1h before detection']
      },
      {
        mmsi: '538007712',
        score: 47,
        distanceKm: 11.4,
        timeDiffMin: 142,
        correlation: 0.48,
        behaviour: 0.55,
        anomalies: ['Restricted manoeuvrability declared', 'Loitering pattern detected']
      },
      { mmsi: '477553100', score: 23, distanceKm: 19.7, timeDiffMin: 208, correlation: 0.21, behaviour: 0.18, anomalies: [] }
    ]
  },
  {
    id: 'INC-2026-0141',
    title: 'Discharge trail on Kutch approach channel',
    region: 'Gulf of Kutch',
    waterBody: 'Gulf of Kutch \u00b7 Vadinar approach',
    status: 'investigating',
    severity: 'high',
    detectedMinAgo: 236,
    center: [22.284, 68.952],
    radiusKm: 2.6,
    elongation: 3.1,
    orientationDeg: 82,
    confidence: 0.88,
    sceneId: 'S1A-IW-20260912T0552',
    oilClass: 'Heavy fuel oil residue',
    assignedTo: 'Lt. S. Iyer',
    spreadRate: 0.96,
    volumeM3: 212,
    driftDirDeg: 96,
    driftSpeedMs: 0.62,
    originAgeMin: 520,
    originConfidence: 0.79,
    notes:
      'Trail aligned with inbound VLCC track. Marine National Park boundary 18 km down-drift - escalation criteria met.',
    lookalikeFlags: ['sediment plume excluded'],
    suspects: [
      {
        mmsi: '374189000',
        score: 84,
        distanceKm: 3.4,
        timeDiffMin: 27,
        correlation: 0.88,
        behaviour: 0.74,
        anomalies: ['Bilge pump signature during night transit', 'AIS position reports thinned to 12-min interval']
      },
      {
        mmsi: '419556320',
        score: 58,
        distanceKm: 7.2,
        timeDiffMin: 96,
        correlation: 0.62,
        behaviour: 0.49,
        anomalies: ['Anchored adjacent to slick tail']
      },
      { mmsi: '431602150', score: 31, distanceKm: 14.8, timeDiffMin: 168, correlation: 0.33, behaviour: 0.22, anomalies: [] }
    ]
  },
  {
    id: 'INC-2026-0139',
    title: 'Sheen patch off Kochi outer roads',
    region: 'Laccadive Sea',
    waterBody: 'Laccadive Sea \u00b7 Kochi outer roads',
    status: 'monitoring',
    severity: 'medium',
    detectedMinAgo: 688,
    center: [9.884, 75.724],
    radiusKm: 1.8,
    elongation: 1.5,
    orientationDeg: 142,
    confidence: 0.71,
    sceneId: 'S1B-IW-20260911T2214',
    oilClass: 'Light distillate sheen',
    assignedTo: 'Analyst R. Menon',
    spreadRate: 0.38,
    volumeM3: 46,
    driftDirDeg: 152,
    driftSpeedMs: 0.28,
    originAgeMin: 640,
    originConfidence: 0.61,
    notes: 'Thin sheen, weathering rapidly. Confidence limited by low wind speed at acquisition time.',
    lookalikeFlags: ['possible low-wind dark patch', 'algal film cannot be fully excluded'],
    suspects: [
      {
        mmsi: '525019334',
        score: 62,
        distanceKm: 4.6,
        timeDiffMin: 54,
        correlation: 0.66,
        behaviour: 0.51,
        anomalies: ['Unscheduled slowdown near slick origin']
      },
      { mmsi: '419330087', score: 37, distanceKm: 9.9, timeDiffMin: 132, correlation: 0.35, behaviour: 0.27, anomalies: [] }
    ]
  },
  {
    id: 'INC-2026-0137',
    title: 'Spill plume off Paradip anchorage',
    region: 'Bay of Bengal',
    waterBody: 'Bay of Bengal \u00b7 Paradip anchorage',
    status: 'active',
    severity: 'high',
    detectedMinAgo: 412,
    center: [20.148, 86.918],
    radiusKm: 2.9,
    elongation: 1.9,
    orientationDeg: 212,
    confidence: 0.83,
    sceneId: 'S1A-IW-20260912T0248',
    oilClass: 'Medium crude (API 30)',
    assignedTo: 'Lt. Cdr. P. Das',
    spreadRate: 1.08,
    volumeM3: 264,
    driftDirDeg: 42,
    driftSpeedMs: 0.37,
    originAgeMin: 470,
    originConfidence: 0.74,
    notes: 'Plume drifting toward shoreline. Shoreline contact projected within 36 hours at current drift.',
    lookalikeFlags: [],
    suspects: [
      {
        mmsi: '352998410',
        score: 78,
        distanceKm: 3.9,
        timeDiffMin: 41,
        correlation: 0.81,
        behaviour: 0.69,
        anomalies: ['Erratic course changes prior to detection', 'Draught change inconsistent with declared cargo ops']
      },
      { mmsi: '419220114', score: 34, distanceKm: 12.6, timeDiffMin: 156, correlation: 0.29, behaviour: 0.24, anomalies: [] }
    ]
  },
  {
    id: 'INC-2026-0135',
    title: 'Low-confidence dark patch, Chennai outer anchorage',
    region: 'Bay of Bengal',
    waterBody: 'Bay of Bengal \u00b7 Chennai outer anchorage',
    status: 'false_positive',
    severity: 'low',
    detectedMinAgo: 1584,
    center: [13.026, 80.522],
    radiusKm: 1.2,
    elongation: 1.2,
    orientationDeg: 64,
    confidence: 0.41,
    sceneId: 'S1B-IW-20260911T0402',
    oilClass: 'Unclassified',
    assignedTo: 'Analyst K. Rao',
    spreadRate: 0.06,
    volumeM3: 4,
    driftDirDeg: 24,
    driftSpeedMs: 0.19,
    originAgeMin: 210,
    originConfidence: 0.28,
    notes: 'Reviewed and closed as a low-wind lookalike. Retained for model retraining as a labelled negative.',
    lookalikeFlags: ['low-wind dark patch confirmed', 'wind speed 1.8 m/s at acquisition'],
    suspects: [
      { mmsi: '419442870', score: 19, distanceKm: 6.1, timeDiffMin: 188, correlation: 0.14, behaviour: 0.12, anomalies: [] },
      { mmsi: '419667203', score: 11, distanceKm: 8.4, timeDiffMin: 244, correlation: 0.08, behaviour: 0.09, anomalies: [] }
    ]
  },
  {
    id: 'INC-2026-0131',
    title: 'Contained slick, Gulf of Khambhat',
    region: 'Arabian Sea',
    waterBody: 'Gulf of Khambhat \u00b7 Hazira fairway',
    status: 'contained',
    severity: 'medium',
    detectedMinAgo: 4330,
    center: [21.052, 72.348],
    radiusKm: 2.1,
    elongation: 1.7,
    orientationDeg: 188,
    confidence: 0.76,
    sceneId: 'S1A-IW-20260909T0931',
    oilClass: 'Marine gas oil',
    assignedTo: 'Cdr. A. Nair',
    spreadRate: 0.22,
    volumeM3: 88,
    driftDirDeg: 188,
    driftSpeedMs: 0.24,
    originAgeMin: 300,
    originConfidence: 0.82,
    notes: 'Response vessels deployed; slick dispersed after 26 hours. Retained for attribution follow-up.',
    lookalikeFlags: [],
    suspects: [
      {
        mmsi: '419884411',
        score: 71,
        distanceKm: 2.8,
        timeDiffMin: 33,
        correlation: 0.76,
        behaviour: 0.58,
        anomalies: ['Fuel transfer logged outside permitted zone']
      },
      { mmsi: '563114900', score: 28, distanceKm: 10.2, timeDiffMin: 174, correlation: 0.26, behaviour: 0.17, anomalies: [] }
    ]
  }
];

function numericSeed(id: string) {
  return id.split('').reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 100000, 7);
}

function buildSlick(seed: IncidentSeed): SlickGeometry {
  const polygon = blobRing(seed.center, seed.radiusKm, numericSeed(seed.id), 28, seed.elongation, seed.orientationDeg);
  const lengthKm = round(seed.radiusKm * 2 * seed.elongation, 2);
  const widthKm = round(seed.radiusKm * 2 * 0.62, 2);
  return {
    polygon,
    centroid: centroidOf(polygon),
    bbox: bboxOf(polygon),
    areaKm2: round(Math.PI * seed.radiusKm * seed.radiusKm * seed.elongation * 0.74, 2),
    lengthKm,
    widthKm,
    perimeterKm: round((lengthKm + widthKm) * 1.72, 2),
    orientationDeg: seed.orientationDeg
  };
}

function buildOrigin(seed: IncidentSeed, centroid: LatLng): OriginEstimate {
  const backBearing = (seed.driftDirDeg + 180) % 360;
  const totalKm = (seed.driftSpeedMs * seed.originAgeMin * 60) / 1000;
  const steps = 14;
  const hindcast: LatLng[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const frac = i / steps;
    const wobble = Math.sin(frac * Math.PI * 1.6) * 9;
    hindcast.push(project(centroid, (backBearing + wobble + 360) % 360, totalKm * frac));
  }
  const position = hindcast[hindcast.length - 1];
  const radiusKm = round(totalKm * (1 - seed.originConfidence) * 0.9 + 1.2, 2);
  return {
    position,
    confidence: seed.originConfidence,
    estimatedAt: isoOffset(-(seed.detectedMinAgo + seed.originAgeMin)),
    methodology: 'Lagrangian backtracking (wind 3.2% leeway + surface current), 500-member ensemble',
    hindcast,
    uncertaintyRing: circleRing(position, radiusKm),
    radiusKm
  };
}

function buildForecast(seed: IncidentSeed, centroid: LatLng, baseArea: number): ForecastStep[] {
  return FORECAST_HORIZONS.map((h, idx) => {
    const travelKm = (seed.driftSpeedMs * h * 3600) / 1000;
    const wobble = Math.sin(h / 12) * 7;
    const next = project(centroid, (seed.driftDirDeg + wobble + 360) % 360, travelKm);
    const area = round(baseArea + seed.spreadRate * h * 0.82, 2);
    const radius = Math.sqrt(area / (Math.PI * 0.74));
    const uncertaintyKm = round(radius + travelKm * 0.22 + h * 0.12, 2);
    return {
      horizonHours: h,
      validAt: isoOffset(h * 60),
      centroid: next,
      polygon: blobRing(next, radius, numericSeed(seed.id) + h, 24, seed.elongation * 0.92, seed.orientationDeg + h),
      uncertaintyRing: circleRing(next, uncertaintyKm),
      areaKm2: area,
      driftSpeedMs: round(seed.driftSpeedMs * (0.94 + (idx % 3) * 0.04), 3),
      driftDirDeg: round((seed.driftDirDeg + wobble + 360) % 360, 0),
      confidence: round(Math.max(0.28, seed.confidence - idx * 0.085), 2),
      shorelineRisk: round(Math.min(0.96, (h / 72) * (seed.severity === 'critical' ? 0.9 : 0.62)), 2),
      nearestShorelineKm: round(Math.max(2, 64 - travelKm * 0.9), 1)
    };
  });
}

function buildEvidence(seed: SuspectSeed, rank: number): AttributionEvidence[] {
  const v = VESSEL_BY_MMSI[seed.mmsi];
  return [
    {
      id: 'spatial',
      label: 'Spatial proximity to estimated origin',
      detail: `Closest approach ${seed.distanceKm.toFixed(1)} km from the estimated release point.`,
      weight: round(Math.max(0.05, 0.34 - seed.distanceKm * 0.012), 2),
      verdict: seed.distanceKm < 6 ? 'supporting' : seed.distanceKm < 12 ? 'neutral' : 'contradicting'
    },
    {
      id: 'temporal',
      label: 'Temporal alignment with release window',
      detail: `Vessel was in the origin cell ${seed.timeDiffMin} min from the modelled release time.`,
      weight: round(Math.max(0.04, 0.28 - seed.timeDiffMin * 0.0011), 2),
      verdict: seed.timeDiffMin < 60 ? 'supporting' : seed.timeDiffMin < 150 ? 'neutral' : 'contradicting'
    },
    {
      id: 'trajectory',
      label: 'Track / slick-axis correlation',
      detail: `AIS track correlates ${(seed.correlation * 100).toFixed(0)}% with the slick major axis.`,
      weight: round(seed.correlation * 0.24, 2),
      verdict: seed.correlation > 0.6 ? 'supporting' : seed.correlation > 0.35 ? 'neutral' : 'contradicting'
    },
    {
      id: 'behaviour',
      label: 'Behavioural anomaly profile',
      detail: seed.anomalies.length
        ? seed.anomalies.join('; ')
        : 'No behavioural anomalies detected in the analysis window.',
      weight: round(seed.behaviour * 0.2, 2),
      verdict: seed.behaviour > 0.55 ? 'supporting' : seed.behaviour > 0.3 ? 'neutral' : 'contradicting'
    },
    {
      id: 'vessel_profile',
      label: 'Vessel type and cargo plausibility',
      detail: `${v.type}, ${v.grossTonnage.toLocaleString('en-US')} GT, draught ${v.draughtM} m - consistent carriage of the detected oil class.`,
      weight: round(v.type.includes('Tanker') ? 0.14 : 0.05, 2),
      verdict: v.type.includes('Tanker') ? 'supporting' : 'neutral'
    },
    {
      id: 'ranking',
      label: 'Ensemble ranking stability',
      detail: `Held rank ${rank} across ${94 - rank * 7}% of 500 Monte-Carlo drift realisations.`,
      weight: round(Math.max(0.02, 0.12 - rank * 0.02), 2),
      verdict: rank === 1 ? 'supporting' : 'neutral'
    }
  ];
}

function buildSuspects(seed: IncidentSeed): SuspectVessel[] {
  return seed.suspects.map((s, idx) => {
    const v = VESSEL_BY_MMSI[s.mmsi];
    const rnd = seededRandom(numericSeed(seed.id) + idx * 17);
    const speedSeries = Array.from({ length: 24 }, (_, i) => {
      const drop = i > 8 && i < 16 ? 0.55 : 1;
      return {
        t: isoOffset(-30 * (23 - i)),
        speedKn: round(Math.max(0.2, v.speedKn * drop * (0.86 + rnd() * 0.28)), 1),
        courseDeg: round((v.courseDeg + (rnd() - 0.5) * (s.behaviour * 70) + 360) % 360, 0),
        distanceKm: round(Math.max(0.4, s.distanceKm * (2.6 - i * 0.07) * (0.92 + rnd() * 0.16)), 2),
        correlation: round(Math.min(0.99, s.correlation * (0.7 + i * 0.014)), 2)
      };
    });

    return {
      rank: idx + 1,
      mmsi: v.mmsi,
      imo: v.imo,
      name: v.name,
      type: v.type,
      flag: v.flag,
      responsibilityScore: s.score,
      confidence: round(Math.min(0.97, (s.score / 100) * 0.95 + 0.04), 2),
      distanceKm: s.distanceKm,
      timeDiffMin: s.timeDiffMin,
      trajectoryCorrelation: s.correlation,
      behaviourScore: s.behaviour,
      anomalies: s.anomalies,
      evidence: buildEvidence(s, idx + 1),
      speedSeries
    };
  });
}

const TIMELINE_TEMPLATE: { stage: TimelineStage; title: string; offsetMin: number; durationSec: number; detail: string }[] = [
  {
    stage: 'satellite_detection',
    title: 'Satellite Detection',
    offsetMin: 0,
    durationSec: 42,
    detail: 'SAR scene ingested, calibrated and land-masked. Candidate dark formation flagged for analysis.'
  },
  {
    stage: 'ai_analysis',
    title: 'AI Analysis',
    offsetMin: 3,
    durationSec: 86,
    detail: 'Segmentation network produced the oil mask and lookalike discrimination scores.'
  },
  {
    stage: 'slick_characterisation',
    title: 'Slick Characterisation',
    offsetMin: 6,
    durationSec: 31,
    detail: 'Polygon vectorised; area, length, width, perimeter and orientation computed.'
  },
  {
    stage: 'environmental_analysis',
    title: 'Environmental Analysis',
    offsetMin: 9,
    durationSec: 24,
    detail: 'Met-ocean fields sampled at acquisition time for wind, current, wave and SST.'
  },
  {
    stage: 'hindcast',
    title: 'Hindcast',
    offsetMin: 12,
    durationSec: 118,
    detail: 'Backward Lagrangian ensemble reconstructed the drift history of the slick.'
  },
  {
    stage: 'origin_estimation',
    title: 'Origin Estimation',
    offsetMin: 16,
    durationSec: 47,
    detail: 'Release point and uncertainty envelope derived from the hindcast ensemble.'
  },
  {
    stage: 'ais_analysis',
    title: 'AIS Analysis',
    offsetMin: 19,
    durationSec: 73,
    detail: 'AIS archive queried for the origin cell and release window; candidate tracks reconstructed.'
  },
  {
    stage: 'vessel_ranking',
    title: 'Vessel Ranking',
    offsetMin: 23,
    durationSec: 56,
    detail: 'Candidates scored on proximity, timing, trajectory correlation and behavioural anomalies.'
  },
  {
    stage: 'forecast',
    title: 'Forecast',
    offsetMin: 27,
    durationSec: 131,
    detail: 'Forward drift generated for +1h to +72h with per-horizon uncertainty envelopes.'
  }
];

function buildTimeline(seed: IncidentSeed, slick: SlickGeometry, suspects: SuspectVessel[]): TimelineEvent[] {
  const env = REGIONAL_CONDITIONS[seed.region];
  return TIMELINE_TEMPLATE.map((tpl, idx) => {
    const running = seed.status === 'active' && idx === TIMELINE_TEMPLATE.length - 1 && seed.detectedMinAgo < 90;
    let metrics: { label: string; value: string }[];
    switch (tpl.stage) {
      case 'satellite_detection':
        metrics = [
          { label: 'Scene', value: seed.sceneId },
          { label: 'Sensor', value: 'Sentinel-1 C-SAR IW' },
          { label: 'Candidates', value: '3' }
        ];
        break;
      case 'ai_analysis':
        metrics = [
          { label: 'Confidence', value: `${(seed.confidence * 100).toFixed(0)}%` },
          { label: 'Model', value: 'oceanx-segformer v2.4.1' },
          { label: 'Lookalike risk', value: `${((1 - seed.confidence) * 42).toFixed(0)}%` }
        ];
        break;
      case 'slick_characterisation':
        metrics = [
          { label: 'Area', value: `${slick.areaKm2} km\u00b2` },
          { label: 'Length', value: `${slick.lengthKm} km` },
          { label: 'Width', value: `${slick.widthKm} km` }
        ];
        break;
      case 'environmental_analysis':
        metrics = [
          { label: 'Wind', value: `${env.windSpeedMs} m/s` },
          { label: 'Current', value: `${env.currentSpeedMs} m/s` },
          { label: 'Wave Hs', value: `${env.waveHeightM} m` }
        ];
        break;
      case 'hindcast':
        metrics = [
          { label: 'Ensemble', value: '500 members' },
          { label: 'Window', value: `${Math.round(seed.originAgeMin / 60)} h` },
          { label: 'Leeway', value: '3.2%' }
        ];
        break;
      case 'origin_estimation':
        metrics = [
          { label: 'Confidence', value: `${(seed.originConfidence * 100).toFixed(0)}%` },
          { label: 'Radius', value: `${round((1 - seed.originConfidence) * 8 + 1.2, 1)} km` }
        ];
        break;
      case 'ais_analysis':
        metrics = [
          { label: 'Tracks scanned', value: `${38 + idx * 3}` },
          { label: 'Candidates', value: `${seed.suspects.length}` }
        ];
        break;
      case 'vessel_ranking':
        metrics = [
          { label: 'Top suspect', value: suspects[0]?.name ?? 'n/a' },
          { label: 'Score', value: `${suspects[0]?.responsibilityScore ?? 0}/100` }
        ];
        break;
      default:
        metrics = [
          { label: 'Horizons', value: '+1h \u2192 +72h' },
          { label: 'Shoreline risk', value: seed.severity === 'critical' ? 'Elevated' : 'Moderate' }
        ];
    }

    return {
      id: `${seed.id}-${tpl.stage}`,
      stage: tpl.stage,
      title: tpl.title,
      timestamp: isoOffset(-seed.detectedMinAgo + tpl.offsetMin),
      status: running ? 'running' : 'complete',
      durationSec: tpl.durationSec,
      detail: tpl.detail,
      metrics
    };
  });
}

function buildIncident(seed: IncidentSeed): Incident {
  const slick = buildSlick(seed);
  const origin = buildOrigin(seed, slick.centroid);
  const suspects = buildSuspects(seed);
  const forecast = buildForecast(seed, slick.centroid, slick.areaKm2);
  const timeline = buildTimeline(seed, slick, suspects);

  return {
    id: seed.id,
    reference: seed.id,
    title: seed.title,
    region: seed.waterBody,
    status: seed.status,
    severity: seed.severity,
    detectedAt: isoOffset(-seed.detectedMinAgo),
    updatedAt: isoOffset(-Math.round(seed.detectedMinAgo / 6)),
    sceneId: seed.sceneId,
    slick,
    detection: {
      detectorId: 'oceanx-segformer',
      detectorName: 'OceanX SAR Slick Segmenter',
      detectorVersion: 'v2.4.1',
      confidence: seed.confidence,
      maskCoveragePct: round(seed.confidence * 18 + 4, 1),
      falsePositiveRisk: round(1 - seed.confidence, 2),
      lookalikeFlags: seed.lookalikeFlags,
      processedAt: isoOffset(-seed.detectedMinAgo + 4),
      stage: 'complete'
    },
    environment: { ...REGIONAL_CONDITIONS[seed.region] },
    origin,
    nearbyVesselMmsi: seed.suspects.map((s) => s.mmsi),
    suspects,
    forecast,
    timeline,
    spreadRateKm2PerHour: seed.spreadRate,
    estimatedVolumeM3: seed.volumeM3,
    oilClass: seed.oilClass,
    assignedTo: seed.assignedTo,
    notes: seed.notes
  };
}

export const INCIDENTS: Incident[] = SEEDS.map(buildIncident);

export const INCIDENT_BY_ID: Record<string, Incident> = INCIDENTS.reduce(
  (acc, i) => ({ ...acc, [i.id]: i }),
  {} as Record<string, Incident>
);

export const PRIMARY_INCIDENT_ID = INCIDENTS[0].id;

export function suspectsAcrossIncidents(): { incidentId: string; suspect: SuspectVessel }[] {
  return INCIDENTS.flatMap((incident) => incident.suspects.map((suspect) => ({ incidentId: incident.id, suspect })));
}

export function originDistance(incidentId: string, mmsi: string) {
  const incident = INCIDENT_BY_ID[incidentId];
  const vessel = VESSEL_BY_MMSI[mmsi];
  if (!incident || !vessel) return 0;
  return round(distanceKm(incident.origin.position, vessel.position), 2);
}
