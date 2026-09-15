'use client';

import { useMemo, useState } from 'react';
import { Satellite } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { MapView } from '@/components/map/MapView';
import { Panel, KeyValue, KeyValueGrid } from '@/components/ui/Panel';
import { Button, ToggleChip } from '@/components/ui/Button';
import { MetricCard } from '@/components/ui/MetricCard';
import { StageBadge } from '@/components/ui/StatusBadge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { SatelliteViewer, VIEWER_MODES, type ViewerMode } from '@/components/satellite/SatelliteViewer';
import { useAsyncData } from '@/hooks/useAsyncData';
import { incidentService, satelliteService } from '@/services';
import { DEFAULT_LAYER_STATE } from '@/lib/constants';
import type { MapLayerId, } from '@/lib/mapLayers';
import type { ProcessingStage } from '@/lib/types';
import { compactNumber, formatDateTime, relativeTime } from '@/lib/utils';

const SCENE_LAYERS: Record<MapLayerId, boolean> = {
  ...DEFAULT_LAYER_STATE,
  aisVessels: false,
  vesselTracks: false,
  suspectVessels: false,
  hindcast: false,
  forecast: false,
  uncertainty: false
};

const STAGES: (ProcessingStage | 'all')[] = ['all', 'complete', 'processing', 'queued', 'failed'];

export default function SatellitePage() {
  const [stage, setStage] = useState<ProcessingStage | 'all'>('all');
  const [sceneId, setSceneId] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewerMode>('overlay');

  const { data, status, error, refetch, isEmpty } = useAsyncData(async () => {
    const [scenes, coverage, passes, incidents] = await Promise.all([
      satelliteService.listScenes({ stage }),
      satelliteService.coverage(),
      satelliteService.upcomingPasses(),
      incidentService.list()
    ]);
    return { scenes, coverage, passes, incidents };
  }, [stage]);

  const scene = useMemo(() => data?.scenes.find((s) => s.id === sceneId) ?? data?.scenes[0] ?? null, [data, sceneId]);
  const incident = useMemo(
    () => data?.incidents.find((i) => i.id === scene?.detectedIncidentId) ?? null,
    [data, scene]
  );

  if (status === 'loading') {
    return (
      <div className="p-4">
        <LoadingState label="Loading satellite catalogue" rows={4} />
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

  return (
    <div className="space-y-3 p-3 lg:space-y-4 lg:p-4">
      <PageHeader
        title="Satellite Explorer"
        description="Browse acquired scenes, inspect imagery and review upcoming acquisition passes over the monitored area."
        actions={<Satellite className="h-4 w-4 text-muted" />}
      />

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <MetricCard index={0} label="Scenes in catalogue" value={data.scenes.length} icon={Satellite} />
        <MetricCard index={1} label="Scenes (24 h)" value={data.coverage.scenes24h} />
        <MetricCard index={2} label="Coverage" value={compactNumber(data.coverage.coverageKm2)} unit="km²" />
        <MetricCard index={3} label="Scenes with detections" value={data.coverage.detectionsFromScenes} tone="accent" />
      </div>

      <Panel title="Processing stage" subtitle="Filter the catalogue">
        <div className="flex flex-wrap gap-1.5">
          {STAGES.map((s) => (
            <ToggleChip key={s} active={stage === s} onClick={() => setStage(s)}>
              {s === 'all' ? 'All' : s}
            </ToggleChip>
          ))}
        </div>
      </Panel>

      {isEmpty && <EmptyState title="No scenes match this stage filter" />}

      {scene && (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="space-y-3">
            <Panel
              title="Scene imagery"
              subtitle={`${scene.id} · ${scene.mission} · acquired ${relativeTime(scene.acquiredAt)}`}
              actions={<StageBadge stage={scene.processingStage} />}
            >
              <div className="mb-3 flex flex-wrap gap-1.5">
                {VIEWER_MODES.map((m) => (
                  <ToggleChip key={m.id} active={mode === m.id} onClick={() => setMode(m.id)}>
                    {m.label}
                  </ToggleChip>
                ))}
              </div>
              <SatelliteViewer
                scene={scene}
                polygon={incident?.slick.polygon}
                mode={mode}
                showOverlay={Boolean(incident)}
                className="aspect-video w-full"
              />
            </Panel>

            <div className="relative h-[38vh] min-h-[280px] overflow-hidden rounded-xl border border-line/80 shadow-panel">
              <MapView
                layers={SCENE_LAYERS}
                incidents={incident ? [incident] : []}
                center={scene.center}
                zoom={7}
                fitTo={scene.footprint}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Panel title="Scene catalogue" subtitle={`${data.scenes.length} scenes`} bodyClassName="space-y-2 max-h-[46vh] overflow-y-auto">
              {data.scenes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSceneId(s.id)}
                  className={`w-full rounded-lg border p-2.5 text-left transition-colors focus-ring ${
                    s.id === scene.id ? 'border-accent/60 bg-accent/10' : 'border-line/70 bg-deep/40 hover:border-accent/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-accent">{s.id}</span>
                    <StageBadge stage={s.processingStage} />
                  </div>
                  <p className="mt-1 truncate text-[11px] text-ink">{s.region}</p>
                  <p className="text-[10px] text-muted">
                    {s.sensor} · {s.polarisation} · {s.resolutionM} m · {relativeTime(s.acquiredAt)}
                  </p>
                </button>
              ))}
            </Panel>

            <Panel title="Scene metadata" subtitle={scene.id}>
              <KeyValueGrid columns={2}>
                <KeyValue label="Mission" value={scene.mission} />
                <KeyValue label="Sensor" value={scene.sensor} />
                <KeyValue label="Mode" value={scene.mode} />
                <KeyValue label="Polarisation" value={scene.polarisation} />
                <KeyValue label="Acquired" value={formatDateTime(scene.acquiredAt)} />
                <KeyValue label="Resolution" value={`${scene.resolutionM} m`} />
                <KeyValue label="Incidence angle" value={`${scene.incidenceAngleDeg}°`} />
                <KeyValue label="Cloud cover" value={`${scene.cloudCoverPct}%`} />
                <KeyValue label="Orbit" value={`${scene.orbit}`} hint={scene.passDirection} />
                <KeyValue label="Swath" value={`${scene.swathKm} km`} />
                <KeyValue label="Size" value={`${scene.sizeMb} MB`} />
                <KeyValue label="Detection" value={scene.detectedIncidentId ?? 'None'} />
              </KeyValueGrid>
              {incident && (
                <Button size="sm" variant="outline" href={`/incidents/${incident.id}`} className="mt-3">
                  Open {incident.id}
                </Button>
              )}
            </Panel>

            <Panel title="Upcoming passes" subtitle="Planned acquisitions">
              <ul className="space-y-2">
                {data.passes.map((p) => (
                  <li key={`${p.mission}-${p.at}`} className="rounded-lg border border-line/70 bg-deep/50 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-ink">{p.mission}</span>
                      <span className="font-mono text-[10px] text-accent">{relativeTime(p.at)}</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted">
                      {p.region} · {p.mode} · {formatDateTime(p.at)}
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
