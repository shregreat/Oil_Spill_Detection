'use client';

import { useEffect, useState } from 'react';
import { Filter, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { ToggleChip } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { IncidentCard } from '@/components/incidents/IncidentCard';
import { useAsyncData } from '@/hooks/useAsyncData';
import { incidentService } from '@/services';
import { useQueryParam } from '@/hooks/useQueryParam';
import type { IncidentStatus, Severity } from '@/lib/types';

const STATUSES: (IncidentStatus | 'all')[] = [
  'all',
  'active',
  'investigating',
  'monitoring',
  'contained',
  'false_positive'
];
const SEVERITIES: (Severity | 'all')[] = ['all', 'critical', 'high', 'medium', 'low'];

const LABELS: Record<string, string> = {
  all: 'All',
  active: 'Active',
  investigating: 'Investigating',
  monitoring: 'Monitoring',
  contained: 'Contained',
  false_positive: 'False positive',
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low'
};

export default function IncidentsPage() {
  const queryTerm = useQueryParam('q');
  const [status, setStatus] = useState<IncidentStatus | 'all'>('all');
  const [severity, setSeverity] = useState<Severity | 'all'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (queryTerm) setSearch(queryTerm);
  }, [queryTerm]);

  const { data, status: loadState, error, refetch, isEmpty } = useAsyncData(
    () => incidentService.list({ status, severity, search }),
    [status, severity, search]
  );

  return (
    <div className="space-y-3 p-3 lg:space-y-4 lg:p-4">
      <PageHeader
        title="Incidents"
        description="Every detection opened as an investigation, with its confidence, geometry and ranked suspects."
      />

      <Panel
        title="Filters"
        subtitle="Status, severity and free-text search across incidents, regions and vessels"
        actions={<Filter className="h-3.5 w-3.5 text-muted" />}
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by incident ID, region, vessel name or MMSI"
              className="input pl-9"
              aria-label="Search incidents"
            />
          </div>

          <div>
            <p className="label-xs mb-1.5">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => (
                <ToggleChip key={s} active={status === s} onClick={() => setStatus(s)}>
                  {LABELS[s]}
                </ToggleChip>
              ))}
            </div>
          </div>

          <div>
            <p className="label-xs mb-1.5">Severity</p>
            <div className="flex flex-wrap gap-1.5">
              {SEVERITIES.map((s) => (
                <ToggleChip key={s} active={severity === s} onClick={() => setSeverity(s)}>
                  {LABELS[s]}
                </ToggleChip>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      {loadState === 'loading' && <LoadingState label="Querying incident service" rows={4} />}
      {loadState === 'error' && <ErrorState description={error ?? undefined} onRetry={refetch} />}
      {isEmpty && (
        <EmptyState
          title="No incidents match these filters"
          description="Try resetting the status and severity filters, or clear the search term."
        />
      )}

      {loadState === 'success' && data && data.length > 0 && (
        <>
          <p className="text-[11px] text-muted">
            Showing <span className="font-mono text-ink">{data.length}</span> incident
            {data.length === 1 ? '' : 's'}
          </p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.map((incident, i) => (
              <IncidentCard key={incident.id} incident={incident} index={i} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
