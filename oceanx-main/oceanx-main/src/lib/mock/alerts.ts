import type { Alert } from '../types';
import { isoOffset } from '../utils';

export const ALERTS: Alert[] = [
  {
    id: 'ALR-4821',
    type: 'new_spill',
    severity: 'critical',
    title: 'New spill detected west of Mumbai High',
    message:
      'Sentinel-1A scene S1A-IW-20260912T0806 produced a 27.1 km\u00b2 slick detection at 94% confidence. Incident INC-2026-0142 opened automatically.',
    createdAt: isoOffset(-72),
    acknowledged: false,
    incidentId: 'INC-2026-0142',
    source: 'Detection pipeline'
  },
  {
    id: 'ALR-4820',
    type: 'high_vessel_correlation',
    severity: 'critical',
    title: 'High vessel correlation - MT ATLAS HORIZON',
    message:
      'Responsibility score 91/100 with a 46-minute AIS gap over the slick head. Evidence package ready for review.',
    createdAt: isoOffset(-64),
    acknowledged: false,
    incidentId: 'INC-2026-0142',
    mmsi: '636019887',
    source: 'Attribution engine'
  },
  {
    id: 'ALR-4819',
    type: 'high_confidence_detection',
    severity: 'high',
    title: 'High-confidence detection on Kutch approach',
    message: 'Detector confidence 88% on a 3.1:1 elongated trail consistent with an operational discharge.',
    createdAt: isoOffset(-231),
    acknowledged: true,
    incidentId: 'INC-2026-0141',
    source: 'Detection pipeline'
  },
  {
    id: 'ALR-4818',
    type: 'rapid_spread',
    severity: 'high',
    title: 'Rapid spread - INC-2026-0142',
    message: 'Spread rate 1.42 km\u00b2/h sustained over three consecutive analysis cycles.',
    createdAt: isoOffset(-48),
    acknowledged: false,
    incidentId: 'INC-2026-0142',
    source: 'Forecast service'
  },
  {
    id: 'ALR-4817',
    type: 'environmental_risk',
    severity: 'high',
    title: 'Protected area within drift envelope',
    message: 'Marine National Park boundary lies 18 km down-drift of INC-2026-0141. Shoreline contact possible at +36h.',
    createdAt: isoOffset(-198),
    acknowledged: false,
    incidentId: 'INC-2026-0141',
    source: 'Environmental risk model'
  },
  {
    id: 'ALR-4816',
    type: 'environmental_risk',
    severity: 'medium',
    title: 'Shoreline contact projected - Paradip',
    message: 'INC-2026-0137 forecast shows 2 km nearest shoreline approach at +48h with 62% shoreline risk.',
    createdAt: isoOffset(-386),
    acknowledged: true,
    incidentId: 'INC-2026-0137',
    source: 'Forecast service'
  },
  {
    id: 'ALR-4815',
    type: 'data_source_failure',
    severity: 'high',
    title: 'RISAT-2B ingest failed',
    message: 'Scene RS2-SCN-20260911T1740 failed checksum validation after three retries. Provider ticket raised.',
    createdAt: isoOffset(-902),
    acknowledged: true,
    source: 'Ingest orchestrator'
  },
  {
    id: 'ALR-4814',
    type: 'ai_service_failure',
    severity: 'medium',
    title: 'Attribution worker degraded',
    message: 'Attribution GPU worker 2 restarted after an out-of-memory event. Queue drained without data loss.',
    createdAt: isoOffset(-742),
    acknowledged: true,
    source: 'Model serving'
  },
  {
    id: 'ALR-4813',
    type: 'high_vessel_correlation',
    severity: 'high',
    title: 'High vessel correlation - MT PANAMA CREST',
    message: 'Responsibility score 84/100 for INC-2026-0141 with thinned AIS reporting during the release window.',
    createdAt: isoOffset(-214),
    acknowledged: false,
    incidentId: 'INC-2026-0141',
    mmsi: '374189000',
    source: 'Attribution engine'
  },
  {
    id: 'ALR-4812',
    type: 'high_confidence_detection',
    severity: 'medium',
    title: 'Detection confirmed off Paradip',
    message: 'Detector confidence 83%; optical cross-check unavailable due to cloud cover.',
    createdAt: isoOffset(-404),
    acknowledged: true,
    incidentId: 'INC-2026-0137',
    source: 'Detection pipeline'
  },
  {
    id: 'ALR-4811',
    type: 'new_spill',
    severity: 'low',
    title: 'Low-confidence candidate off Chennai',
    message: 'Candidate scored 41% and was reviewed as a low-wind lookalike. Closed as a false positive.',
    createdAt: isoOffset(-1578),
    acknowledged: true,
    incidentId: 'INC-2026-0135',
    source: 'Detection pipeline'
  },
  {
    id: 'ALR-4810',
    type: 'data_source_failure',
    severity: 'info',
    title: 'AIS terrestrial feed latency elevated',
    message: 'Terrestrial AIS latency rose to 41 s for 12 minutes. Satellite AIS maintained full coverage.',
    createdAt: isoOffset(-1290),
    acknowledged: true,
    source: 'AIS gateway'
  }
];

export const ALERT_BY_ID: Record<string, Alert> = ALERTS.reduce(
  (acc, a) => ({ ...acc, [a.id]: a }),
  {} as Record<string, Alert>
);
