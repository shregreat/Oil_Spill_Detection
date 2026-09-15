'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  BrainCircuit,
  Gauge,
  RefreshCw,
  Satellite,
  Ship,
  ShieldAlert,
  Siren,
  Waves,
  Wind
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { BottomSheet } from '@/components/layout/BottomSheet';
import { MapView } from '@/components/map/MapView';
import { MapLayerControl } from '@/components/map/MapLayerControl';
import { MapLegend } from '@/components/map/MapLegend';
import { MetricCard } from '@/components/ui/MetricCard';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { HealthBadge } from '@/components/ui/StatusBadge';
import { IncidentCard } from '@/components/incidents/IncidentCard';
import { AlertPanel } from '@/components/alerts/AlertPanel';
import { EnvironmentalPanel } from '@/components/environment/EnvironmentalPanel';
import { useAsyncData } from '@/hooks/useAsyncData';
import { aisService, alertService, incidentService, oceanService, weatherService } from '@/services';
import { DEFAULT_LAYER_STATE } from '@/lib/constants';
import type { MapLayerId } from '@/lib/mapLayers';
import { formatDateTime, relativeTime } from '@/lib/utils';

export default function DashboardPage() {
  const [layers, setLayers] = useState<Record<MapLayerId, boolean>>({ ...DEFAULT_LAYER_STATE });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedMmsi, setSelectedMmsi] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data, status, error, refetch } = useAsyncData(async () => {
    const [stats, incidents, alerts, vessels, wind, currents, heat, environment] = await Promise.all([
      incidentService.stats(),
      incidentService.list(),
      alertService.list(),
      aisService.listVessels(),
      weatherService.windField(),
      oceanService.currentField(),
      oceanService.detectionHeatmap(),
      weatherService.current('Arabian Sea')
    ]);

    const suspectMmsi = Array.from(new Set(incidents.flatMap((i) => i.suspects.slice(0, 2).map((s) => s.mmsi))));
    const tracks = await aisService.getTracks(suspectMmsi);

    return { stats, incidents, alerts, vessels, tracks, wind, currents, heat, environment };
  }, []);

  const active = useMemo(
    () => data?.incidents.filter((i) => ['active', 'investigating', 'monitoring'].includes(i.status)) ?? [],
    [data]
  );
  const selected = useMemo(
    () => active.find((i) => i.id === selectedId) ?? active[0] ?? null,
    [active, selectedId]
  );

  const suspectMarkers = useMemo(
    () =>
      selected?.suspects.map((s) => ({ mmsi: s.mmsi, rank: s.rank, score: s.responsibilityScore })) ?? [],
    [selected]
  );

  if (status === 'loading') {
    return (
      <div className="p-4">
        <LoadingState label="Building the operational picture" rows={6} />
      </div>
    );
  }

  if (status === 'error' || !data) {
    return (
      <div className="p-4">
        <ErrorState description={error ?? undefined} onRetry={refetch} />
      </div>
    );
  }

  const { stats } = data;

  const panels = (
    <>
      <Panel
        title="Active incidents"
        subtitle={`${active.length} open · select one to focus the map`}
        bodyClassName="space-y-2 max-h-[42vh] overflow-y-auto"
      >
        {active.map((incident, i) => (
          <IncidentCard
            key={incident.id}
            incident={incident}
            index={i}
            selected={incident.id === selected?.id}
            onSelect={setSelectedId}
          />
        ))}
      </Panel>

      <Panel
        title="Priority alerts"
        subtitle="Unacknowledged first"
        actions={
          <Button size="sm" variant="ghost" href="/alerts">
            View all
          </Button>
        }
      >
        <AlertPanel
          compact
          alerts={[...data.alerts].sort((a, b) => Number(a.acknowledged) - Number(b.acknowledged)).slice(0, 5)}
        />
      </Panel>

      <Panel title="Met-ocean conditions" subtitle={selected?.region ?? 'Arabian Sea'}>
        <EnvironmentalPanel environment={selected?.environment ?? data.environment} columns={2} />
      </Panel>
    </>
  );

  return (
    <div className="space-y-3 p-3 lg:space-y-4 lg:p-4">
      <PageHeader
        title="Command Dashboard"
        description="Live detection, drift and attribution picture across the Indian EEZ. Mock service layer - ready for backend connection."
        actions={
          <Button size="sm" variant="secondary" onClick={refetch}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        }
      />

      {/* Statistics ------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-5">
        <MetricCard
          index={0}
          label="Active incidents"
          value={stats.activeIncidents}
          delta={stats.activeIncidentsDelta}
          icon={Siren}
          tone="critical"
          href="/incidents"
        />
        <MetricCard
          index={1}
          label="New detections (24h)"
          value={stats.newDetections24h}
          delta={stats.newDetectionsDelta}
          icon={Waves}
          tone="accent"
          href="/detection"
        />
        <MetricCard
          index={2}
          label="Detected spill area"
          value={stats.totalSpillAreaKm2}
          unit="km²"
          delta={stats.spillAreaDelta}
          icon={Gauge}
          tone="warning"
        />
        <MetricCard
          index={3}
          label="High-confidence detections"
          value={stats.highConfidenceDetections}
          delta={stats.highConfidenceDelta}
          icon={Activity}
          hint="Detector confidence ≥ 85%"
        />
        <MetricCard
          index={4}
          label="Potential suspect vessels"
          value={stats.suspectVessels}
          delta={stats.suspectVesselsDelta}
          icon={ShieldAlert}
          tone="critical"
          href="/attribution"
        />
        <MetricCard
          index={5}
          label="Latest satellite update"
          value={relativeTime(stats.latestSatelliteUpdate)}
          icon={Satellite}
          hint={`${stats.latestSatelliteScene} · ${formatDateTime(stats.latestSatelliteUpdate)}`}
          href="/satellite"
        />
        <MetricCard
          index={6}
          label="Latest AIS update"
          value={relativeTime(stats.latestAisUpdate)}
          icon={Ship}
          hint={`${stats.aisMessageRate} msg/min · ${stats.vesselsTracked} vessels tracked`}
          href="/ais"
        />
        <MetricCard
          index={7}
          label="Weather / ocean status"
          value={<span className="text-base">Nominal</span>}
          icon={Wind}
          hint={stats.weatherSummary}
          footer={<HealthBadge status={stats.weatherStatus} />}
          href="/data-sources"
        />
        <MetricCard
          index={8}
          label="AI model status"
          value={<span className="text-base">{stats.modelStatus === 'operational' ? 'Nominal' : 'Degraded'}</span>}
          icon={BrainCircuit}
          tone={stats.modelStatus === 'operational' ? 'positive' : 'warning'}
          hint={stats.modelSummary}
          footer={<HealthBadge status={stats.modelStatus} />}
          href="/model-status"
        />
      </div>

      {/* Map + side analytics --------------------------------------------- */}
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="relative h-[58vh] min-h-[380px] overflow-hidden rounded-xl border border-line/80 shadow-panel xl:h-[calc(100vh-16rem)]">
          <MapView
            layers={layers}
            incidents={active}
            vessels={data.vessels}
            tracks={data.tracks}
            suspects={suspectMarkers}
            hindcast={selected?.origin.hindcast}
            origin={
              selected
                ? {
                    position: selected.origin.position,
                    ring: selected.origin.uncertaintyRing,
                    confidence: selected.origin.confidence
                  }
                : null
            }
            forecast={selected?.forecast ?? []}
            activeForecastIndex={2}
            wind={data.wind}
            currents={data.currents}
            heat={data.heat}
            selectedIncidentId={selected?.id ?? null}
            onSelectIncident={setSelectedId}
            selectedMmsi={selectedMmsi}
            onSelectVessel={setSelectedMmsi}
            fitTo={selected?.slick.polygon}
          />

          <div className="absolute left-3 top-3 z-[1000]">
            <MapLayerControl value={layers} onChange={setLayers} />
          </div>
          <div className="absolute bottom-3 left-3 z-[1000] hidden sm:block">
            <MapLegend visible={layers} />
          </div>
        </div>

        <div className="hidden space-y-3 xl:block">{panels}</div>
      </div>

      {/* Tablet / mobile stacking ----------------------------------------- */}
      <div className="space-y-3 xl:hidden">
        <div className="hidden space-y-3 md:block">{panels}</div>
        <div className="md:hidden">
          <BottomSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            title="Operational panels"
            subtitle={`${active.length} active incidents · ${data.alerts.length} alerts`}
            peekLabel="Incidents, alerts and conditions"
          >
            {panels}
          </BottomSheet>
        </div>
      </div>
    </div>
  );
}
