'use client';

import { useState, useEffect } from 'react';
import { BrainCircuit, Server, Cpu, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel, KeyValue, KeyValueGrid } from '@/components/ui/Panel';
import { Button, ToggleChip } from '@/components/ui/Button';
import { HealthBadge } from '@/components/ui/StatusBadge';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { ChartFrame, LineTrend } from '@/components/charts/Charts';
import { useAsyncData } from '@/hooks/useAsyncData';
import { systemService } from '@/services';
import { oilSpillService, type HealthResponse } from '@/services/oilSpillService';
import { compactNumber, formatDateTime, pct, relativeTime } from '@/lib/utils';

export default function ModelStatusPage() {
  const [modelId, setModelId] = useState<string | null>(null);
  const [liveHealth, setLiveHealth] = useState<HealthResponse | null>(null);
  const [isHealthLoading, setIsHealthLoading] = useState(false);

  const { data, status, error, refetch } = useAsyncData(() => systemService.models(), []);

  const fetchHealth = async () => {
    setIsHealthLoading(true);
    try {
      const h = await oilSpillService.checkHealth();
      setLiveHealth(h);
    } catch {
      setLiveHealth(null);
    } finally {
      setIsHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const model = data?.find((m) => m.id === modelId) ?? data?.[0] ?? null;

  if (status === 'loading') {
    return (
      <div className="p-4">
        <LoadingState label="Loading model registry" rows={5} />
      </div>
    );
  }
  if (status === 'error' || !data || !model) {
    return (
      <div className="p-4">
        <ErrorState description={error ?? undefined} onRetry={refetch} />
      </div>
    );
  }

  const isBackendOnline = liveHealth?.status === 'healthy';

  return (
    <div className="space-y-3 p-3 lg:space-y-4 lg:p-4">
      <PageHeader
        title="AI Model Status & Serving Health"
        description="Live telemetry, PyTorch U-Net backend serving state, and model performance metrics."
        actions={
          <Button size="sm" variant="secondary" onClick={fetchHealth} disabled={isHealthLoading}>
            <RefreshCw className={`h-3.5 w-3.5 ${isHealthLoading ? 'animate-spin' : ''}`} />
            Refresh Backend
          </Button>
        }
      />

      {/* Live PyTorch Backend Card */}
      <Panel
        title="Live PyTorch U-Net Inference Service"
        subtitle="Hardware device, active model weights and serving status"
        actions={
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                isBackendOnline
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
              }`}
            >
              {isBackendOnline ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {isBackendOnline ? 'Backend Online' : 'Backend Standby'}
            </span>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-line/60 bg-deep/40 p-3">
            <div className="flex items-center gap-2 text-muted text-xs">
              <Server className="h-4 w-4 text-accent" />
              <span>Model Architecture</span>
            </div>
            <p className="mt-1 font-mono text-xs font-bold text-ink truncate">
              {liveHealth?.model_name || 'U-Net DeepConv'}
            </p>
            <p className="text-[10px] text-muted">Weights: best_oil_spill_unet.pth</p>
          </div>

          <div className="rounded-lg border border-line/60 bg-deep/40 p-3">
            <div className="flex items-center gap-2 text-muted text-xs">
              <Cpu className="h-4 w-4 text-accent" />
              <span>Inference Device</span>
            </div>
            <p className="mt-1 font-mono text-xs font-bold text-ink uppercase">
              {liveHealth?.device || 'CPU'}
            </p>
            <p className="text-[10px] text-muted">PyTorch 2.x acceleration</p>
          </div>

          <div className="rounded-lg border border-line/60 bg-deep/40 p-3">
            <div className="flex items-center gap-2 text-muted text-xs">
              <BrainCircuit className="h-4 w-4 text-accent" />
              <span>Decision Threshold</span>
            </div>
            <p className="mt-1 font-mono text-xs font-bold text-ink">
              {liveHealth?.threshold ?? 0.40}
            </p>
            <p className="text-[10px] text-muted">Noise filter: ≥ {liveHealth?.min_area_pixels ?? 100} px</p>
          </div>

          <div className="rounded-lg border border-line/60 bg-deep/40 p-3">
            <div className="flex items-center gap-2 text-muted text-xs">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              <span>Storage Layer</span>
            </div>
            <p className="mt-1 font-mono text-xs font-bold text-ink">
              {liveHealth?.supabase_connected ? 'Supabase Cloud' : 'Local SQLite Store'}
            </p>
            <p className="text-[10px] text-muted">Offline-resilient persistence</p>
          </div>
        </div>
      </Panel>

      {/* Model Cards */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setModelId(m.id)}
            className={`rounded-xl border p-3 text-left transition-colors focus-ring ${
              m.id === model.id ? 'border-accent/60 bg-accent/8' : 'border-line/80 bg-panel/70 hover:border-accent/40'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-ink">{m.name}</p>
                <p className="truncate text-[10px] text-muted">{m.task}</p>
              </div>
              <HealthBadge status={m.status} />
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              <div>
                <p className="label-xs">F1</p>
                <p className="font-mono text-[11px] text-ink">{m.f1.toFixed(3)}</p>
              </div>
              <div>
                <p className="label-xs">Latency</p>
                <p className="font-mono text-[11px] text-ink">{m.avgInferenceMs} ms</p>
              </div>
              <div>
                <p className="label-xs">Drift</p>
                <p className={`font-mono text-[11px] ${m.driftScore > 0.18 ? 'text-amber-300' : 'text-ink'}`}>
                  {m.driftScore.toFixed(2)}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
        <ChartFrame title={`Quality history · ${model.name}`} subtitle="Weekly precision, recall and F1" height={280}>
          <LineTrend
            data={model.history}
            xKey="date"
            series={[
              { key: 'f1', name: 'F1', color: '#22d3ee' },
              { key: 'precision', name: 'Precision', color: '#22c55e' },
              { key: 'recall', name: 'Recall', color: '#f59e0b' }
            ]}
          />
        </ChartFrame>

        <Panel title="Model detail" subtitle={`${model.version} · ${model.framework}`}>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <HealthBadge status={model.status} />
              <ToggleChip active={false} onClick={refetch}>
                Refresh metrics
              </ToggleChip>
            </div>
            <KeyValueGrid columns={2}>
              <KeyValue label="Task" value={model.task} />
              <KeyValue label="Accuracy" value={pct(model.accuracy, 1)} />
              <KeyValue label="Precision" value={pct(model.precision, 1)} />
              <KeyValue label="Recall" value={pct(model.recall, 1)} />
              <KeyValue label="F1" value={model.f1.toFixed(3)} />
              {typeof model.iou === 'number' && <KeyValue label="Mask IoU" value={model.iou.toFixed(3)} />}
              <KeyValue label="Avg inference" value={`${model.avgInferenceMs} ms`} />
              <KeyValue label="Inferences (24 h)" value={compactNumber(model.inferencesLast24h)} />
              <KeyValue label="GPU utilisation" value={`${model.gpuUtilPct}%`} />
              <KeyValue label="Drift score" value={model.driftScore.toFixed(2)} hint={model.driftScore > 0.18 ? 'Retraining recommended' : 'Within tolerance'} />
              <KeyValue
                label="Last trained"
                value={formatDateTime(model.lastTrainedAt)}
                hint={relativeTime(model.lastTrainedAt)}
              />
            </KeyValueGrid>
          </div>
        </Panel>
      </div>
    </div>
  );
}
