'use client';

import { useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel, KeyValue, KeyValueGrid } from '@/components/ui/Panel';
import { ToggleChip } from '@/components/ui/Button';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { Timeline } from '@/components/timeline/Timeline';
import { IncidentStatusBadge, SeverityBadge } from '@/components/ui/StatusBadge';
import { useAsyncData } from '@/hooks/useAsyncData';
import { incidentService } from '@/services';
import { formatDateTime, relativeTime } from '@/lib/utils';

export default function TimelinePage() {
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const { data, status, error, refetch } = useAsyncData(() => incidentService.list(), []);

  const incident = useMemo(
    () => data?.find((i) => i.id === incidentId) ?? data?.[0] ?? null,
    [data, incidentId]
  );

  if (status === 'loading') {
    return (
      <div className="p-4">
        <LoadingState label="Loading analysis pipeline history" rows={5} />
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

  const total = incident.timeline.reduce((sum, e) => sum + e.durationSec, 0);

  return (
    <div className="space-y-3 p-3 lg:space-y-4 lg:p-4">
      <PageHeader
        title="Incident Timeline"
        description="End-to-end analysis chain from satellite detection through to forecast, with timestamps and stage metrics."
        actions={<Clock className="h-4 w-4 text-muted" />}
      />

      <Panel title="Incident" subtitle="Select an incident to inspect its pipeline">
        <div className="flex flex-wrap gap-1.5">
          {data?.map((i) => (
            <ToggleChip key={i.id} active={i.id === incident.id} onClick={() => setIncidentId(i.id)}>
              {i.id}
            </ToggleChip>
          ))}
        </div>
      </Panel>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title={`Analysis chain · ${incident.id}`} subtitle={incident.title}>
          <Timeline events={incident.timeline} />
        </Panel>

        <div className="space-y-3">
          <Panel title="Summary" subtitle={incident.region}>
            <div className="mb-3 flex flex-wrap gap-1.5">
              <SeverityBadge severity={incident.severity} />
              <IncidentStatusBadge status={incident.status} />
            </div>
            <KeyValueGrid columns={2}>
              <KeyValue label="Detected" value={formatDateTime(incident.detectedAt)} hint={relativeTime(incident.detectedAt)} />
              <KeyValue label="Last update" value={relativeTime(incident.updatedAt)} />
              <KeyValue label="Stages" value={`${incident.timeline.length}`} />
              <KeyValue label="Total compute" value={`${total} s`} />
              <KeyValue label="Scene" value={incident.sceneId} />
              <KeyValue label="Assigned to" value={incident.assignedTo} />
            </KeyValueGrid>
          </Panel>

          <Panel title="Stage durations" subtitle="Seconds per stage">
            <ul className="space-y-1.5">
              {incident.timeline.map((e) => (
                <li key={e.id} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted">{e.title}</span>
                    <span className="font-mono text-ink">{e.durationSec}s</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-deep">
                    <div
                      className="h-full rounded-full bg-accent/70"
                      style={{ width: `${Math.round((e.durationSec / total) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
