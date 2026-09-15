import type { HealthState, IncidentStatus, ProcessingStage, Severity } from '@/lib/types';
import { cn } from '@/lib/utils';

const INCIDENT_STATUS: Record<IncidentStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'border-bad/50 bg-bad/15 text-rose-300' },
  investigating: { label: 'Investigating', className: 'border-sev-high/50 bg-sev-high/15 text-orange-300' },
  monitoring: { label: 'Monitoring', className: 'border-sev-medium/50 bg-sev-medium/15 text-amber-200' },
  contained: { label: 'Contained', className: 'border-ok/50 bg-ok/15 text-emerald-300' },
  closed: { label: 'Closed', className: 'border-line bg-panel2 text-muted' },
  false_positive: { label: 'False positive', className: 'border-line bg-panel2 text-slate-400' }
};

const SEVERITY: Record<Severity, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'border-sev-critical/60 bg-sev-critical/15 text-rose-300' },
  high: { label: 'High', className: 'border-sev-high/60 bg-sev-high/15 text-orange-300' },
  medium: { label: 'Medium', className: 'border-sev-medium/60 bg-sev-medium/15 text-amber-200' },
  low: { label: 'Low', className: 'border-sev-low/60 bg-sev-low/15 text-sky-300' },
  info: { label: 'Info', className: 'border-line bg-panel2 text-muted' }
};

const HEALTH: Record<HealthState, { label: string; className: string; dot: string }> = {
  operational: { label: 'Operational', className: 'border-ok/50 bg-ok/12 text-emerald-300', dot: 'bg-ok' },
  degraded: { label: 'Degraded', className: 'border-warn/50 bg-warn/12 text-amber-300', dot: 'bg-warn' },
  offline: { label: 'Offline', className: 'border-bad/50 bg-bad/12 text-rose-300', dot: 'bg-bad' },
  maintenance: { label: 'Maintenance', className: 'border-sev-low/50 bg-sev-low/12 text-sky-300', dot: 'bg-sev-low' }
};

const STAGE: Record<ProcessingStage, { label: string; className: string }> = {
  queued: { label: 'Queued', className: 'border-line bg-panel2 text-muted' },
  processing: { label: 'Processing', className: 'border-accent/50 bg-accent/12 text-accent' },
  detection: { label: 'Detection', className: 'border-oil/50 bg-oil/12 text-fuchsia-300' },
  complete: { label: 'Complete', className: 'border-ok/50 bg-ok/12 text-emerald-300' },
  failed: { label: 'Failed', className: 'border-bad/50 bg-bad/12 text-rose-300' }
};

const BASE = 'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium';

export function IncidentStatusBadge({ status, className }: { status: IncidentStatus; className?: string }) {
  const cfg = INCIDENT_STATUS[status];
  return <span className={cn(BASE, cfg.className, className)}>{cfg.label}</span>;
}

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const cfg = SEVERITY[severity];
  return <span className={cn(BASE, cfg.className, className)}>{cfg.label}</span>;
}

export function HealthBadge({ status, className }: { status: HealthState; className?: string }) {
  const cfg = HEALTH[status];
  return (
    <span className={cn(BASE, cfg.className, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

export function StageBadge({ stage, className }: { stage: ProcessingStage; className?: string }) {
  const cfg = STAGE[stage];
  return (
    <span className={cn(BASE, cfg.className, className)}>
      {stage === 'processing' || stage === 'detection' ? (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      ) : null}
      {cfg.label}
    </span>
  );
}
