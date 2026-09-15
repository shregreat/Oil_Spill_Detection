'use client';

import { useEffect, useState } from 'react';
import { BellRing, CheckCheck, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Button, ToggleChip } from '@/components/ui/Button';
import { MetricCard } from '@/components/ui/MetricCard';
import { AlertPanel } from '@/components/alerts/AlertPanel';
import { ErrorState, InlineNotice, LoadingState } from '@/components/ui/States';
import { useAsyncData } from '@/hooks/useAsyncData';
import { ALERT_TYPE_LABELS, alertService } from '@/services';
import type { Alert, Severity } from '@/lib/types';

const SEVERITIES: (Severity | 'all')[] = ['all', 'critical', 'high', 'medium', 'low', 'info'];
const TYPES: (Alert['type'] | 'all')[] = [
  'all',
  'new_spill',
  'high_confidence_detection',
  'rapid_spread',
  'high_vessel_correlation',
  'environmental_risk',
  'data_source_failure',
  'ai_service_failure'
];

export default function AlertsPage() {
  const [severity, setSeverity] = useState<Severity | 'all'>('all');
  const [type, setType] = useState<Alert['type'] | 'all'>('all');
  const [onlyUnacknowledged, setOnlyUnacknowledged] = useState(false);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [local, setLocal] = useState<Alert[]>([]);

  const { data, status, error, refetch } = useAsyncData(
    () => alertService.list({ severity, type, onlyUnacknowledged, search }),
    [severity, type, onlyUnacknowledged, search]
  );

  useEffect(() => {
    if (data) setLocal(data);
  }, [data]);

  const acknowledge = async (id: string) => {
    const updated = await alertService.acknowledge(id);
    setLocal((prev) => prev.map((a) => (a.id === id ? updated : a)));
    setNotice(`Alert ${id} acknowledged.`);
  };

  const acknowledgeAll = async () => {
    const updated = await alertService.acknowledgeAll();
    setLocal(updated);
    setNotice('All alerts acknowledged.');
  };

  const counts = {
    total: local.length,
    unacknowledged: local.filter((a) => !a.acknowledged).length,
    critical: local.filter((a) => a.severity === 'critical').length,
    high: local.filter((a) => a.severity === 'high').length
  };

  return (
    <div className="space-y-3 p-3 lg:space-y-4 lg:p-4">
      <PageHeader
        title="Alerts Centre"
        description="Detection, spread, attribution, environmental and service-health alerts with severity triage."
        actions={
          <Button size="sm" variant="secondary" onClick={acknowledgeAll}>
            <CheckCheck className="h-3.5 w-3.5" />
            Acknowledge all
          </Button>
        }
      />

      {notice && <InlineNotice tone="success">{notice}</InlineNotice>}

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <MetricCard index={0} label="Alerts in view" value={counts.total} icon={BellRing} />
        <MetricCard index={1} label="Unacknowledged" value={counts.unacknowledged} tone="critical" />
        <MetricCard index={2} label="Critical" value={counts.critical} tone="critical" />
        <MetricCard index={3} label="High" value={counts.high} tone="warning" />
      </div>

      <Panel title="Filters" subtitle="Severity, category and acknowledgement state">
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search alert titles and messages"
              className="input pl-9"
              aria-label="Search alerts"
            />
          </div>

          <div>
            <p className="label-xs mb-1.5">Severity</p>
            <div className="flex flex-wrap gap-1.5">
              {SEVERITIES.map((s) => (
                <ToggleChip key={s} active={severity === s} onClick={() => setSeverity(s)}>
                  {s === 'all' ? 'All' : s}
                </ToggleChip>
              ))}
            </div>
          </div>

          <div>
            <p className="label-xs mb-1.5">Category</p>
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map((t) => (
                <ToggleChip key={t} active={type === t} onClick={() => setType(t)}>
                  {t === 'all' ? 'All' : ALERT_TYPE_LABELS[t]}
                </ToggleChip>
              ))}
            </div>
          </div>

          <ToggleChip active={onlyUnacknowledged} onClick={() => setOnlyUnacknowledged((v) => !v)}>
            Unacknowledged only
          </ToggleChip>
        </div>
      </Panel>

      {status === 'loading' && <LoadingState label="Loading alerts" rows={4} />}
      {status === 'error' && <ErrorState description={error ?? undefined} onRetry={refetch} />}
      {status === 'success' && <AlertPanel alerts={local} onAcknowledge={acknowledge} />}
    </div>
  );
}
