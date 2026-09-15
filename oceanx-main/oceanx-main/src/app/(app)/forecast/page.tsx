'use client';

import { useEffect, useMemo, useState } from 'react';
import { Navigation, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { MapView } from '@/components/map/MapView';
import { MapLegend } from '@/components/map/MapLegend';
import { MapLayerControl } from '@/components/map/MapLayerControl';
import { Panel, KeyValue, KeyValueGrid } from '@/components/ui/Panel';
import { Button, ToggleChip } from '@/components/ui/Button';
import { TimeSlider } from '@/components/ui/TimeSlider';
import { EnvironmentalPanel } from '@/components/environment/EnvironmentalPanel';
import { ForecastChart } from '@/components/charts/Charts';
import { ErrorState, InlineNotice, LoadingState } from '@/components/ui/States';
import { useAsyncData } from '@/hooks/useAsyncData';
import { forecastService, incidentService } from '@/services';
import { useQueryParam } from '@/hooks/useQueryParam';
import { DEFAULT_LAYER_STATE } from '@/lib/constants';
import type { MapLayerId } from '@/lib/mapLayers';
import { formatDateTime, formatLatLng, pct } from '@/lib/utils';

export default function ForecastPage() {
  const requestedId = useQueryParam('incident');

  const [incidentId, setIncidentId] = useState<string | null>(null);

  useEffect(() => {
    if (requestedId) setIncidentId(requestedId);
  }, [requestedId]);
  const [horizon, setHorizon] = useState(3);
  const [playing, setPlaying] = useState(true);
  const [layers, setLayers] = useState<Record<MapLayerId, boolean>>({
    ...DEFAULT_LAYER_STATE,
    currents: true,
    wind: true
  });
  const [recomputed, setRecomputed] = useState(false);

  const { data, status, error, refetch } = useAsyncData(() => incidentService.list(), []);

  const incidents = useMemo(() => data?.filter((i) => i.status !== 'false_positive') ?? [], [data]);
  const incident = useMemo(
    () => incidents.find((i) => i.id === incidentId) ?? incidents[0] ?? null,
    [incidents, incidentId]
  );

  if (status === 'loading') {
    return (
      <div className="p-4">
        <LoadingState label="Loading drift model output" rows={4} />
      </div>
    );
  }
  if (status === 'error' || !incident) {
    return (
      <div className="p-4">
        <ErrorState description={error ?? undefined} onRetry={refetch} />
      </div>
    );
  }

  const step = incident.forecast[horizon];

  const recompute = async () => {
    await forecastService.recompute(incident.id);
    setRecomputed(true);
  };

  return (
    <div className="space-y-3 p-3 lg:space-y-4 lg:p-4">
      <PageHeader
        title="Drift Forecast"
        description="Historical hindcast, current slick position and forward drift with per-horizon uncertainty envelopes."
        actions={
          <Button size="sm" variant="secondary" onClick={recompute}>
            <RefreshCw className="h-3.5 w-3.5" />
            Recompute ensemble
          </Button>
        }
      />

      {recomputed && (
        <InlineNotice tone="success">
          Drift ensemble re-queued for {incident.id}. Results will stream in over the realtime channel once the backend
          is connected.
        </InlineNotice>
      )}

      <Panel title="Incident" subtitle="Select the slick to model">
        <div className="flex flex-wrap gap-1.5">
          {incidents.map((i) => (
            <ToggleChip key={i.id} active={i.id === incident.id} onClick={() => setIncidentId(i.id)}>
              {i.id} · {i.region.split('·')[0].trim()}
            </ToggleChip>
          ))}
        </div>
      </Panel>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-3">
          <div className="relative h-[50vh] min-h-[340px] overflow-hidden rounded-xl border border-line/80 shadow-panel">
            <MapView
              layers={layers}
              incidents={[incident]}
              hindcast={incident.origin.hindcast}
              origin={{
                position: incident.origin.position,
                ring: incident.origin.uncertaintyRing,
                confidence: incident.origin.confidence
              }}
              forecast={incident.forecast}
              activeForecastIndex={horizon}
              selectedIncidentId={incident.id}
              fitTo={[...incident.slick.polygon, incident.origin.position, ...incident.forecast.map((f) => f.centroid)]}
            />
            <div className="absolute left-3 top-3 z-[1000]">
              <MapLayerControl value={layers} onChange={setLayers} />
            </div>
            <div className="absolute bottom-3 left-3 z-[1000] hidden sm:block">
              <MapLegend visible={layers} />
            </div>
          </div>

          <TimeSlider
            title="Drift animation"
            steps={incident.forecast.map((f) => ({
              label: `+${f.horizonHours}h`,
              sublabel: `${formatDateTime(f.validAt)} · ${f.areaKm2} km²`
            }))}
            index={horizon}
            onChange={setHorizon}
            playing={playing}
            onPlayingChange={setPlaying}
            intervalMs={1600}
          />

          <ForecastChart forecast={incident.forecast} />
        </div>

        <div className="space-y-3">
          <Panel title="Selected horizon" subtitle={`+${step.horizonHours}h · ${formatDateTime(step.validAt)}`}>
            <KeyValueGrid columns={2}>
              <KeyValue label="Projected area" value={`${step.areaKm2} km²`} />
              <KeyValue label="Confidence" value={pct(step.confidence, 0)} />
              <KeyValue label="Centroid" value={formatLatLng(step.centroid)} />
              <KeyValue label="Drift speed" value={`${step.driftSpeedMs} m/s`} />
              <KeyValue label="Drift direction" value={`${step.driftDirDeg}°`} />
              <KeyValue label="Shoreline risk" value={pct(step.shorelineRisk, 0)} />
              <KeyValue label="Nearest shoreline" value={`${step.nearestShorelineKm} km`} />
              <KeyValue label="Spread rate" value={`${incident.spreadRateKm2PerHour} km²/h`} />
            </KeyValueGrid>
          </Panel>

          <Panel title="Current slick" subtitle={incident.region}>
            <KeyValueGrid columns={2}>
              <KeyValue label="Area now" value={`${incident.slick.areaKm2} km²`} />
              <KeyValue label="Centroid" value={formatLatLng(incident.slick.centroid)} />
              <KeyValue label="Estimated origin" value={formatLatLng(incident.origin.position)} />
              <KeyValue label="Origin confidence" value={pct(incident.origin.confidence, 0)} />
            </KeyValueGrid>
          </Panel>

          <Panel title="Environmental conditions" subtitle="Driving the drift solution">
            <EnvironmentalPanel environment={incident.environment} columns={2} />
          </Panel>

          <Panel title="Model" subtitle="Drift ensemble configuration">
            <div className="space-y-2">
              <KeyValue label="Methodology" value={incident.origin.methodology} />
              <KeyValue
                label="Horizons"
                value={incident.forecast.map((f) => `+${f.horizonHours}h`).join(', ')}
                hint="Uncertainty grows with horizon"
              />
              <div className="flex items-center gap-2 text-[11px] text-muted">
                <Navigation className="h-3.5 w-3.5 text-accent" />
                Forward track and the active horizon polygon are drawn on the map.
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
