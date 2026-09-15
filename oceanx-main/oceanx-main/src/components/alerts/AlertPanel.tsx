'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Bell,
  BrainCircuit,
  Check,
  CloudOff,
  Gauge,
  Ship,
  TrendingUp,
  Waves,
  type LucideIcon
} from 'lucide-react';
import type { Alert } from '@/lib/types';
import { ALERT_TYPE_LABELS } from '@/services';
import { cn, relativeTime } from '@/lib/utils';
import { SeverityBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/States';

const TYPE_ICONS: Record<Alert['type'], LucideIcon> = {
  new_spill: Waves,
  high_confidence_detection: Gauge,
  rapid_spread: TrendingUp,
  high_vessel_correlation: Ship,
  environmental_risk: AlertTriangle,
  data_source_failure: CloudOff,
  ai_service_failure: BrainCircuit
};

export function AlertPanel({
  alerts,
  onAcknowledge,
  compact = false,
  className
}: {
  alerts: Alert[];
  onAcknowledge?: (id: string) => void;
  compact?: boolean;
  className?: string;
}) {
  if (alerts.length === 0) {
    return (
      <EmptyState
        title="No alerts in this view"
        description="Nothing requires attention with the current filters."
        className={className}
      />
    );
  }

  return (
    <ul className={cn('space-y-2', className)}>
      <AnimatePresence initial={false}>
        {alerts.map((alert, index) => {
          const Icon = TYPE_ICONS[alert.type] ?? Bell;
          return (
            <motion.li
              key={alert.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.24, delay: Math.min(index * 0.03, 0.24) }}
              className={cn(
                'rounded-xl border bg-panel/70 p-3',
                alert.acknowledged ? 'border-line/70 opacity-70' : 'border-line/80',
                !alert.acknowledged && alert.severity === 'critical' && 'border-bad/50'
              )}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={cn(
                    'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border',
                    alert.severity === 'critical'
                      ? 'border-bad/40 bg-bad/12 text-rose-300'
                      : alert.severity === 'high'
                        ? 'border-sev-high/40 bg-sev-high/12 text-orange-300'
                        : 'border-line bg-panel2 text-muted'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-xs font-semibold text-ink">{alert.title}</p>
                    <SeverityBadge severity={alert.severity} />
                    {alert.acknowledged && (
                      <span className="rounded-full border border-line bg-panel2 px-2 py-0.5 text-[10px] text-muted">
                        Acknowledged
                      </span>
                    )}
                  </div>

                  {!compact && <p className="mt-1 text-[11px] leading-relaxed text-muted">{alert.message}</p>}

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted">
                    <span>{ALERT_TYPE_LABELS[alert.type]}</span>
                    <span>{alert.source}</span>
                    <span>{relativeTime(alert.createdAt)}</span>
                    {alert.incidentId && (
                      <Link href={`/incidents/${alert.incidentId}`} className="text-accent hover:underline">
                        {alert.incidentId}
                      </Link>
                    )}
                    {alert.mmsi && (
                      <Link href={`/ais?mmsi=${alert.mmsi}`} className="text-accent hover:underline">
                        MMSI {alert.mmsi}
                      </Link>
                    )}
                  </div>
                </div>

                {onAcknowledge && !alert.acknowledged && (
                  <button
                    type="button"
                    onClick={() => onAcknowledge(alert.id)}
                    aria-label={`Acknowledge ${alert.title}`}
                    className="shrink-0 rounded-lg border border-line p-1.5 text-muted transition-colors hover:border-ok/50 hover:text-emerald-300 focus-ring"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
