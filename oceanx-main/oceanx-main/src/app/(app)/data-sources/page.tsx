'use client';

import { Activity, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { MetricCard } from '@/components/ui/MetricCard';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { DataSourceStatus } from '@/components/system/DataSourceStatus';
import { useAsyncData } from '@/hooks/useAsyncData';
import { systemService } from '@/services';
import { useConnection } from '@/hooks/useConnection';
import { ConnectionIndicator } from '@/components/layout/ConnectionIndicator';

export default function DataSourcesPage() {
  const { state, eventCount, reconnect } = useConnection();

  const { data, status, error, refetch } = useAsyncData(async () => {
    const [sources, queue] = await Promise.all([systemService.dataSources(), systemService.pipelineQueue()]);
    return { sources, queue };
  }, []);

  if (status === 'loading') {
    return (
      <div className="p-4">
        <LoadingState label="Polling data source health" rows={5} />
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

  const operational = data.sources.filter((s) => s.status === 'operational').length;
  const degraded = data.sources.filter((s) => s.status !== 'operational').length;
  const avgLatency = Math.round(data.sources.reduce((sum, s) => sum + s.latencyMs, 0) / data.sources.length);

  return (
    <div className="space-y-3 p-3 lg:space-y-4 lg:p-4">
      <PageHeader
        title="Data Sources & System Health"
        description="Ingest status for satellite, AIS, weather and ocean providers, plus the processing pipeline queue."
        actions={
          <>
            <ConnectionIndicator state={state} eventCount={eventCount} onReconnect={reconnect} />
            <Button size="sm" variant="secondary" onClick={refetch}>
              <RefreshCw className="h-3.5 w-3.5" />
              Poll now
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <MetricCard index={0} label="Sources operational" value={operational} tone="positive" icon={Activity} />
        <MetricCard index={1} label="Needing attention" value={degraded} tone={degraded ? 'warning' : 'default'} />
        <MetricCard index={2} label="Average latency" value={avgLatency} unit="ms" />
        <MetricCard index={3} label="Realtime channel" value={state} tone={state === 'LIVE' ? 'positive' : 'warning'} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {data.sources.map((source, i) => (
          <DataSourceStatus key={source.id} source={source} index={i} />
        ))}
      </div>

      <Panel title="Processing pipeline" subtitle="Queue depth per stage" flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="border-b border-line/80">
                {['Stage', 'Queued', 'Running', 'Failed', 'Avg duration'].map((h) => (
                  <th key={h} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.queue.map((row) => (
                <tr key={row.stage} className="border-b border-line/50">
                  <td className="px-3 py-2 text-xs text-ink">{row.stage}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted">{row.queued}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-accent">{row.running}</td>
                  <td className={`px-3 py-2 font-mono text-[11px] ${row.failed ? 'text-rose-300' : 'text-muted'}`}>
                    {row.failed}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted">{row.avgSec}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
