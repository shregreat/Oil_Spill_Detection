'use client';

import { useEffect, useMemo, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel, KeyValue, KeyValueGrid } from '@/components/ui/Panel';
import { ToggleChip } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { ConfidenceMeter } from '@/components/ui/ConfidenceBadge';
import { EvidencePanel, VesselRanking } from '@/components/vessels/VesselRanking';
import { ChartFrame, LineTrend } from '@/components/charts/Charts';
import { useAsyncData } from '@/hooks/useAsyncData';
import { incidentService } from '@/services';
import { useQueryParam } from '@/hooks/useQueryParam';
import { formatDateTime, pct } from '@/lib/utils';

export default function AttributionPage() {
  const preselectMmsi = useQueryParam('mmsi');

  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [selectedMmsi, setSelectedMmsi] = useState<string | null>(null);

  useEffect(() => {
    if (preselectMmsi) setSelectedMmsi(preselectMmsi);
  }, [preselectMmsi]);

  const { data, status, error, refetch } = useAsyncData(() => incidentService.list(), []);

  const incidents = useMemo(() => data?.filter((i) => i.suspects.length > 0) ?? [], [data]);
  const incident = useMemo(() => {
    if (preselectMmsi) {
      const match = incidents.find((i) => i.suspects.some((s) => s.mmsi === preselectMmsi));
      if (match && !incidentId) return match;
    }
    return incidents.find((i) => i.id === incidentId) ?? incidents[0] ?? null;
  }, [incidents, incidentId, preselectMmsi]);

  const suspect = useMemo(
    () => incident?.suspects.find((s) => s.mmsi === selectedMmsi) ?? incident?.suspects[0] ?? null,
    [incident, selectedMmsi]
  );

  if (status === 'loading') {
    return (
      <div className="p-4">
        <LoadingState label="Loading attribution results" rows={4} />
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
        title="Vessel Attribution"
        description="Candidate vessels ranked by spatial proximity, temporal alignment, trajectory correlation and behavioural anomalies."
        actions={<ShieldAlert className="h-4 w-4 text-muted" />}
      />

      <Panel title="Incident" subtitle="Select the incident to attribute">
        <div className="flex flex-wrap gap-1.5">
          {incidents.map((i) => (
            <ToggleChip
              key={i.id}
              active={i.id === incident?.id}
              onClick={() => {
                setIncidentId(i.id);
                setSelectedMmsi(null);
              }}
            >
              {i.id} · {i.suspects.length} suspects
            </ToggleChip>
          ))}
        </div>
      </Panel>

      {!incident && <EmptyState title="No attribution results available" />}

      {incident && (
        <>
          <Panel
            title="Suspect ranking"
            subtitle={`${incident.id} · origin estimated ${formatDateTime(incident.origin.estimatedAt)} · origin confidence ${pct(
              incident.origin.confidence,
              0
            )}`}
            flush
          >
            <VesselRanking suspects={incident.suspects} selectedMmsi={suspect?.mmsi} onSelect={setSelectedMmsi} />
          </Panel>

          {suspect && (
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="grid gap-3 md:grid-cols-2">
                <ChartFrame title="Vessel speed" subtitle="AIS reported speed over ground (kn)" height={200}>
                  <LineTrend
                    timeAxis
                    data={suspect.speedSeries}
                    xKey="t"
                    series={[{ key: 'speedKn', name: 'Speed (kn)', color: '#22d3ee' }]}
                  />
                </ChartFrame>
                <ChartFrame title="Vessel course" subtitle="Course over ground (degrees)" height={200}>
                  <LineTrend
                    timeAxis
                    data={suspect.speedSeries}
                    xKey="t"
                    series={[{ key: 'courseDeg', name: 'Course (°)', color: '#f59e0b' }]}
                  />
                </ChartFrame>
                <ChartFrame title="Distance from estimated origin" subtitle="Kilometres" height={200}>
                  <LineTrend
                    timeAxis
                    data={suspect.speedSeries}
                    xKey="t"
                    series={[{ key: 'distanceKm', name: 'Distance (km)', color: '#a78bfa' }]}
                  />
                </ChartFrame>
                <ChartFrame title="Trajectory correlation" subtitle="Correlation with the slick major axis" height={200}>
                  <LineTrend
                    timeAxis
                    data={suspect.speedSeries}
                    xKey="t"
                    series={[{ key: 'correlation', name: 'Correlation', color: '#22c55e' }]}
                  />
                </ChartFrame>
              </div>

              <Panel title="Evidence package" subtitle={`${suspect.name} · rank ${suspect.rank}`}>
                <div className="space-y-3">
                  <ConfidenceMeter confidence={suspect.confidence} label="Attribution confidence" />
                  <KeyValueGrid columns={2}>
                    <KeyValue label="Responsibility score" value={`${suspect.responsibilityScore}/100`} />
                    <KeyValue label="Distance to origin" value={`${suspect.distanceKm} km`} />
                    <KeyValue label="Time difference" value={`${suspect.timeDiffMin} min`} />
                    <KeyValue label="Trajectory correlation" value={pct(suspect.trajectoryCorrelation, 0)} />
                    <KeyValue label="Behaviour score" value={pct(suspect.behaviourScore, 0)} />
                    <KeyValue label="MMSI / IMO" value={`${suspect.mmsi} / ${suspect.imo}`} />
                  </KeyValueGrid>
                  <EvidencePanel suspect={suspect} />
                </div>
              </Panel>
            </div>
          )}
        </>
      )}
    </div>
  );
}
