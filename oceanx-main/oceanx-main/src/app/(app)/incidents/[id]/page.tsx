'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ChevronLeft,
  Clock,
  Gauge,
  History,
  Navigation,
  Ship,
  ShieldAlert,
  Waves,
  Wind
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { MapView } from '@/components/map/MapView';
import { MapLegend } from '@/components/map/MapLegend';
import { MapLayerControl } from '@/components/map/MapLayerControl';
import { Panel, KeyValue, KeyValueGrid } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { TimeSlider } from '@/components/ui/TimeSlider';
import { ConfidenceMeter } from '@/components/ui/ConfidenceBadge';
import { IncidentStatusBadge, SeverityBadge, StageBadge } from '@/components/ui/StatusBadge';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { SatelliteViewer } from '@/components/satellite/SatelliteViewer';
import { EnvironmentalPanel } from '@/components/environment/EnvironmentalPanel';
import { EvidencePanel, VesselRanking } from '@/components/vessels/VesselRanking';
import { VesselTable } from '@/components/vessels/VesselTable';
import { Timeline } from '@/components/timeline/Timeline';
import { ForecastChart } from '@/components/charts/Charts';
import { useAsyncData } from '@/hooks/useAsyncData';
import { aisService, incidentService, satelliteService } from '@/services';
import { DEFAULT_LAYER_STATE } from '@/lib/constants';
import type { MapLayerId } from '@/lib/mapLayers';
import { distanceKm, formatDateTime, formatLatLng, pct, relativeTime, round } from '@/lib/utils';

const TABS = [
  { id: 'detection', label: 'Detection', icon: Gauge },
  { id: 'environment', label: 'Environment', icon: Wind },
  { id: 'origin', label: 'Origin', icon: History },
  { id: 'ais', label: 'AIS', icon: Ship },
  { id: 'attribution', label: 'Attribution', icon: ShieldAlert },
  { id: 'forecast', label: 'Forecast', icon: Navigation },
  { id: 'timeline', label: 'Timeline', icon: Clock }
];

export default function IncidentDetailsPage() {
  const params = useParams<{ id: string }>();
  const incidentId = params.id;

  const [tab, setTab] = useState('detection');
  const [horizon, setHorizon] = useState(2);
  const [playing, setPlaying] = useState(false);
  const [selectedMmsi, setSelectedMmsi] = useState<string | null>(null);
  const [layers, setLayers] = useState<Record<MapLayerId, boolean>>({ ...DEFAULT_LAYER_STATE });

  const { data, status, error, refetch } = useAsyncData(async () => {
    const incident = await incidentService.get(incidentId);
    const [tracks, scene, vessels] = await Promise.all([
      aisService.getTracks(incident.nearbyVesselMmsi),
      satelliteService.getScene(incident.sceneId).catch(() => null),
      aisService.listVessels()
    ]);
    return { incident, tracks, scene, vessels };
  }, [incidentId]);

  const nearbyVessels = useMemo(
    () => data?.vessels.filter((v) => data.incident.nearbyVesselMmsi.includes(v.mmsi)) ?? [],
    [data]
  );

  const selectedSuspect = useMemo(
    () => data?.incident.suspects.find((s) => s.mmsi === selectedMmsi) ?? data?.incident.suspects[0] ?? null,
    [data, selectedMmsi]
  );

  if (status === 'loading') {
    return (
      <div className="p-4">
        <LoadingState label="Loading investigation" rows={5} />
      </div>
    );
  }
  if (status === 'error' || !data) {
    return (
      <div className="p-4">
        <ErrorState title="Incident unavailable" description={error ?? undefined} onRetry={refetch} />
      </div>
    );
  }

  const { incident } = data;
  const step = incident.forecast[horizon];

  return (
    <div className="space-y-3 p-3 lg:space-y-4 lg:p-4">
      <PageHeader
        breadcrumb={
          <Link href="/incidents" className="inline-flex items-center gap-1 text-muted hover:text-accent">
            <ChevronLeft className="h-3 w-3" /> Incidents
          </Link>
        }
        title={`${incident.id} · ${incident.title}`}
        description={`${incident.region} · detected ${formatDateTime(incident.detectedAt)} (${relativeTime(
          incident.detectedAt
        )}) · assigned to ${incident.assignedTo}`}
        actions={
          <>
            <SeverityBadge severity={incident.severity} />
            <IncidentStatusBadge status={incident.status} />
            <Button size="sm" variant="secondary" href={`/forecast?incident=${incident.id}`}>
              <Navigation className="h-3.5 w-3.5" />
              Drift view
            </Button>
          </>
        }
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_460px]">
        {/* Map + scrubber */}
        <div className="space-y-3">
          <div className="relative h-[46vh] min-h-[320px] overflow-hidden rounded-xl border border-line/80 shadow-panel">
            <MapView
              layers={layers}
              incidents={[incident]}
              vessels={nearbyVessels}
              tracks={data.tracks}
              suspects={incident.suspects.map((s) => ({
                mmsi: s.mmsi,
                rank: s.rank,
                score: s.responsibilityScore
              }))}
              hindcast={incident.origin.hindcast}
              origin={{
                position: incident.origin.position,
                ring: incident.origin.uncertaintyRing,
                confidence: incident.origin.confidence
              }}
              forecast={incident.forecast}
              activeForecastIndex={horizon}
              selectedIncidentId={incident.id}
              selectedMmsi={selectedMmsi}
              onSelectVessel={setSelectedMmsi}
              fitTo={[...incident.slick.polygon, incident.origin.position, step.centroid]}
            />
            <div className="absolute left-3 top-3 z-[1000]">
              <MapLayerControl value={layers} onChange={setLayers} />
            </div>
            <div className="absolute bottom-3 left-3 z-[1000] hidden sm:block">
              <MapLegend visible={layers} />
            </div>
          </div>

          <TimeSlider
            title="Forecast horizon"
            steps={incident.forecast.map((f) => ({
              label: `+${f.horizonHours}h`,
              sublabel: `${formatDateTime(f.validAt)} · ${f.areaKm2} km² · confidence ${pct(f.confidence, 0)}`
            }))}
            index={horizon}
            onChange={setHorizon}
            playing={playing}
            onPlayingChange={setPlaying}
          />

          {data.scene && (
            <Panel title="Source imagery" subtitle={`${data.scene.id} · ${data.scene.mission}`}>
              <SatelliteViewer
                scene={data.scene}
                polygon={incident.slick.polygon}
                mode="overlay"
                className="aspect-video w-full"
              />
            </Panel>
          )}
        </div>

        {/* Investigation tabs */}
        <Panel title="Investigation" subtitle="Detection, environment, origin, AIS, attribution and forecast">
          <Tabs tabs={TABS} active={tab} onChange={setTab} className="mb-3" />

          {tab === 'detection' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <StageBadge stage={incident.detection.stage} />
                <span className="font-mono text-[11px] text-muted">{incident.detection.detectorVersion}</span>
              </div>
              <ConfidenceMeter confidence={incident.detection.confidence} />
              <KeyValueGrid columns={2}>
                <KeyValue label="Area" value={`${incident.slick.areaKm2} km²`} />
                <KeyValue label="Length" value={`${incident.slick.lengthKm} km`} />
                <KeyValue label="Width" value={`${incident.slick.widthKm} km`} />
                <KeyValue label="Perimeter" value={`${incident.slick.perimeterKm} km`} />
                <KeyValue label="Centroid" value={formatLatLng(incident.slick.centroid)} />
                <KeyValue label="Orientation" value={`${incident.slick.orientationDeg}°`} />
                <KeyValue label="BBox N / S" value={`${incident.slick.bbox.north} / ${incident.slick.bbox.south}`} />
                <KeyValue label="BBox E / W" value={`${incident.slick.bbox.east} / ${incident.slick.bbox.west}`} />
                <KeyValue label="Oil class" value={incident.oilClass} />
                <KeyValue label="Estimated volume" value={`${incident.estimatedVolumeM3} m³`} />
                <KeyValue label="Spread rate" value={`${incident.spreadRateKm2PerHour} km²/h`} />
                <KeyValue label="Mask coverage" value={`${incident.detection.maskCoveragePct}%`} />
              </KeyValueGrid>
              <p className="rounded-lg border border-line/70 bg-deep/50 p-3 text-[11px] leading-relaxed text-muted">
                {incident.notes}
              </p>
            </div>
          )}

          {tab === 'environment' && (
            <div className="space-y-3">
              <EnvironmentalPanel environment={incident.environment} columns={2} />
              <KeyValue
                label="Weather summary"
                value={incident.environment.weather}
                hint={`Observed ${formatDateTime(incident.environment.observedAt)}`}
              />
            </div>
          )}

          {tab === 'origin' && (
            <div className="space-y-3">
              <ConfidenceMeter confidence={incident.origin.confidence} label="Origin confidence" />
              <KeyValueGrid columns={2}>
                <KeyValue label="Estimated origin" value={formatLatLng(incident.origin.position)} />
                <KeyValue label="Release time" value={formatDateTime(incident.origin.estimatedAt)} />
                <KeyValue label="Uncertainty radius" value={`${incident.origin.radiusKm} km`} />
                <KeyValue label="Hindcast points" value={`${incident.origin.hindcast.length}`} />
              </KeyValueGrid>
              <KeyValue label="Methodology" value={incident.origin.methodology} />
              <p className="text-[11px] text-muted">
                The backward trajectory and uncertainty envelope are drawn on the map when the Hindcast and Uncertainty
                layers are enabled.
              </p>
            </div>
          )}

          {tab === 'ais' && (
            <div className="space-y-3">
              <VesselTable vessels={nearbyVessels} selectedMmsi={selectedMmsi} onSelect={setSelectedMmsi} />
              <KeyValueGrid columns={2}>
                {nearbyVessels.slice(0, 4).map((v) => (
                  <KeyValue
                    key={v.mmsi}
                    label={v.name}
                    value={`${round(distanceKm(incident.origin.position, v.position), 1)} km from origin`}
                    hint={`${v.type} · last report ${relativeTime(v.timestamp)}`}
                  />
                ))}
              </KeyValueGrid>
            </div>
          )}

          {tab === 'attribution' && (
            <div className="space-y-3">
              <VesselRanking
                suspects={incident.suspects}
                selectedMmsi={selectedSuspect?.mmsi}
                onSelect={setSelectedMmsi}
              />
              {selectedSuspect && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-ink">
                    Evidence · {selectedSuspect.name}{' '}
                    <span className="font-mono text-muted">({selectedSuspect.responsibilityScore}/100)</span>
                  </p>
                  <EvidencePanel suspect={selectedSuspect} />
                </div>
              )}
            </div>
          )}

          {tab === 'forecast' && (
            <div className="space-y-3">
              <ForecastChart forecast={incident.forecast} height={200} />
              <KeyValueGrid columns={2}>
                <KeyValue label="Horizon" value={`+${step.horizonHours}h`} hint={formatDateTime(step.validAt)} />
                <KeyValue label="Projected area" value={`${step.areaKm2} km²`} />
                <KeyValue label="Centroid" value={formatLatLng(step.centroid)} />
                <KeyValue label="Drift" value={`${step.driftSpeedMs} m/s @ ${step.driftDirDeg}°`} />
                <KeyValue label="Confidence" value={pct(step.confidence, 0)} />
                <KeyValue label="Shoreline risk" value={pct(step.shorelineRisk, 0)} />
                <KeyValue label="Nearest shoreline" value={`${step.nearestShorelineKm} km`} />
                <KeyValue label="Horizons available" value={incident.forecast.map((f) => `+${f.horizonHours}h`).join(', ')} />
              </KeyValueGrid>
            </div>
          )}

          {tab === 'timeline' && <Timeline events={incident.timeline} compact />}
        </Panel>
      </div>
    </div>
  );
}
