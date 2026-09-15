/**
 * OceanX domain model.
 *
 * These types are the contract between the UI and the service layer.
 * The mock services in `src/lib/mock` and the future real backend must both
 * satisfy these shapes, so the UI never needs to change.
 */

export type LatLng = [number, number]; // [lat, lng]
export type Ring = LatLng[];

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type IncidentStatus =
  | 'active'
  | 'investigating'
  | 'monitoring'
  | 'contained'
  | 'closed'
  | 'false_positive';

export type ConnectionState = 'LIVE' | 'CONNECTING' | 'OFFLINE';

export type ProcessingStage = 'queued' | 'processing' | 'detection' | 'complete' | 'failed';

export type HealthState = 'operational' | 'degraded' | 'offline' | 'maintenance';

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface SlickGeometry {
  polygon: Ring;
  centroid: LatLng;
  bbox: BoundingBox;
  areaKm2: number;
  lengthKm: number;
  widthKm: number;
  perimeterKm: number;
  orientationDeg: number;
}

export interface DetectionResult {
  detectorId: string;
  detectorName: string;
  detectorVersion: string;
  confidence: number; // 0..1
  maskCoveragePct: number;
  falsePositiveRisk: number; // 0..1
  lookalikeFlags: string[];
  processedAt: string; // ISO
  stage: ProcessingStage;
}

export interface EnvironmentSnapshot {
  observedAt: string;
  windSpeedMs: number;
  windDirDeg: number;
  windGustMs: number;
  currentSpeedMs: number;
  currentDirDeg: number;
  waveHeightM: number;
  wavePeriodS: number;
  seaSurfaceTempC: number;
  airTempC: number;
  visibilityKm: number;
  weather: string;
  salinityPsu: number;
}

export interface OriginEstimate {
  position: LatLng;
  confidence: number;
  estimatedAt: string; // ISO - when the spill is believed to have started
  methodology: string;
  hindcast: LatLng[];
  uncertaintyRing: Ring;
  radiusKm: number;
}

export type VesselType =
  | 'Crude Oil Tanker'
  | 'Product Tanker'
  | 'Chemical Tanker'
  | 'Bulk Carrier'
  | 'Container Ship'
  | 'LNG Carrier'
  | 'Fishing Vessel'
  | 'Offshore Supply'
  | 'Tug'
  | 'Cargo';

export interface Vessel {
  mmsi: string;
  imo: string;
  name: string;
  callSign: string;
  type: VesselType;
  flag: string;
  lengthM: number;
  beamM: number;
  grossTonnage: number;
  draughtM: number;
  destination: string;
  eta: string;
  navStatus: string;
  position: LatLng;
  speedKn: number;
  headingDeg: number;
  courseDeg: number;
  rateOfTurn: number;
  timestamp: string;
  aisClass: 'A' | 'B';
  operator: string;
}

export interface TrackPoint {
  position: LatLng;
  timestamp: string;
  speedKn: number;
  courseDeg: number;
}

export interface VesselTrack {
  mmsi: string;
  name: string;
  points: TrackPoint[];
}

export interface AttributionEvidence {
  id: string;
  label: string;
  detail: string;
  weight: number; // contribution to the score, 0..1
  verdict: 'supporting' | 'neutral' | 'contradicting';
}

export interface SuspectVessel {
  rank: number;
  mmsi: string;
  imo: string;
  name: string;
  type: VesselType;
  flag: string;
  responsibilityScore: number; // 0..100
  confidence: number; // 0..1
  distanceKm: number; // closest approach to estimated origin
  timeDiffMin: number; // |t_vessel - t_origin|
  trajectoryCorrelation: number; // 0..1
  behaviourScore: number; // 0..1, higher = more anomalous
  anomalies: string[];
  evidence: AttributionEvidence[];
  speedSeries: { t: string; speedKn: number; courseDeg: number; distanceKm: number; correlation: number }[];
}

export interface ForecastStep {
  horizonHours: number;
  validAt: string;
  centroid: LatLng;
  polygon: Ring;
  uncertaintyRing: Ring;
  areaKm2: number;
  driftSpeedMs: number;
  driftDirDeg: number;
  confidence: number;
  shorelineRisk: number; // 0..1
  nearestShorelineKm: number;
}

export interface VectorSample {
  position: LatLng;
  speed: number; // m/s
  directionDeg: number;
}

export interface HeatPoint {
  position: LatLng;
  intensity: number; // 0..1
}

export type TimelineStage =
  | 'satellite_detection'
  | 'ai_analysis'
  | 'slick_characterisation'
  | 'environmental_analysis'
  | 'hindcast'
  | 'origin_estimation'
  | 'ais_analysis'
  | 'vessel_ranking'
  | 'forecast';

export interface TimelineEvent {
  id: string;
  stage: TimelineStage;
  title: string;
  timestamp: string;
  status: 'complete' | 'running' | 'pending' | 'failed';
  durationSec: number;
  detail: string;
  metrics: { label: string; value: string }[];
}

export interface SatelliteScene {
  id: string;
  mission: string;
  sensor: string;
  mode: string;
  polarisation: string;
  acquiredAt: string;
  resolutionM: number;
  incidenceAngleDeg: number;
  cloudCoverPct: number;
  footprint: Ring;
  center: LatLng;
  swathKm: number;
  orbit: number;
  passDirection: 'ascending' | 'descending';
  processingStage: ProcessingStage;
  sizeMb: number;
  region: string;
  detectedIncidentId?: string;
}

export interface Incident {
  id: string;
  reference: string;
  title: string;
  region: string;
  status: IncidentStatus;
  severity: Severity;
  detectedAt: string;
  updatedAt: string;
  sceneId: string;
  slick: SlickGeometry;
  detection: DetectionResult;
  environment: EnvironmentSnapshot;
  origin: OriginEstimate;
  nearbyVesselMmsi: string[];
  suspects: SuspectVessel[];
  forecast: ForecastStep[];
  timeline: TimelineEvent[];
  spreadRateKm2PerHour: number;
  estimatedVolumeM3: number;
  oilClass: string;
  assignedTo: string;
  notes: string;
}

export interface Alert {
  id: string;
  type:
    | 'new_spill'
    | 'high_confidence_detection'
    | 'rapid_spread'
    | 'high_vessel_correlation'
    | 'environmental_risk'
    | 'data_source_failure'
    | 'ai_service_failure';
  severity: Severity;
  title: string;
  message: string;
  createdAt: string;
  acknowledged: boolean;
  incidentId?: string;
  mmsi?: string;
  source: string;
}

export interface DataSource {
  id: string;
  name: string;
  category: 'satellite' | 'ais' | 'weather' | 'ocean' | 'internal';
  provider: string;
  status: HealthState;
  latencyMs: number;
  uptime30dPct: number;
  lastSyncAt: string;
  refreshIntervalMin: number;
  recordsLast24h: number;
  endpoint: string;
  message: string;
}

export interface ModelStatus {
  id: string;
  name: string;
  task: string;
  version: string;
  framework: string;
  status: HealthState;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  iou?: number;
  avgInferenceMs: number;
  inferencesLast24h: number;
  gpuUtilPct: number;
  lastTrainedAt: string;
  driftScore: number;
  history: { date: string; f1: number; precision: number; recall: number }[];
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: 'Administrator' | 'Analyst' | 'Operator' | 'Viewer';
  organisation: string;
  status: 'active' | 'invited' | 'suspended';
  lastActiveAt: string;
  mfaEnabled: boolean;
  incidentsHandled: number;
}

export interface DashboardStats {
  activeIncidents: number;
  activeIncidentsDelta: number;
  newDetections24h: number;
  newDetectionsDelta: number;
  totalSpillAreaKm2: number;
  spillAreaDelta: number;
  highConfidenceDetections: number;
  highConfidenceDelta: number;
  suspectVessels: number;
  suspectVesselsDelta: number;
  latestSatelliteUpdate: string;
  latestSatelliteScene: string;
  latestAisUpdate: string;
  aisMessageRate: number;
  weatherStatus: HealthState;
  weatherSummary: string;
  modelStatus: HealthState;
  modelSummary: string;
  vesselsTracked: number;
}

export interface AnalyticsSeries {
  spillAreaOverTime: { date: string; areaKm2: number; incidents: number }[];
  confidenceDistribution: { bucket: string; count: number }[];
  incidentsByRegion: { region: string; incidents: number; areaKm2: number }[];
  detectionAccuracy: { date: string; truePositives: number; falsePositives: number }[];
  windCurrentConditions: { hour: string; windMs: number; currentMs: number; waveM: number }[];
  vesselSpeedProfile: { t: string; suspect: number; fleetMedian: number }[];
  vesselCourseProfile: { t: string; suspect: number; expected: number }[];
  driftForecastSpread: { horizon: string; areaKm2: number; uncertaintyKm2: number }[];
  topRankedVessels: { name: string; score: number }[];
}

export interface ServiceError {
  code: string;
  message: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
