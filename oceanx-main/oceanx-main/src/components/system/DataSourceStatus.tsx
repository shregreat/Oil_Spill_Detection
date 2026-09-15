'use client';

import { motion } from 'framer-motion';
import { Database, Satellite, Ship, Waves, Wind } from 'lucide-react';
import type { DataSource } from '@/lib/types';
import { cn, compactNumber, relativeTime } from '@/lib/utils';
import { HealthBadge } from '@/components/ui/StatusBadge';

const CATEGORY_ICONS = {
  satellite: Satellite,
  ais: Ship,
  weather: Wind,
  ocean: Waves,
  internal: Database
} as const;

export function DataSourceStatus({
  source,
  index = 0,
  className
}: {
  source: DataSource;
  index?: number;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[source.category];

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.04, 0.3) }}
      className={cn('rounded-xl border border-line/80 bg-panel/70 p-3', className)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-deep text-accent">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-ink">{source.name}</p>
            <p className="truncate text-[10px] text-muted">{source.provider}</p>
          </div>
        </div>
        <HealthBadge status={source.status} />
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <p className="label-xs">Latency</p>
          <p className="font-mono text-[11px] text-ink">{source.latencyMs} ms</p>
        </div>
        <div>
          <p className="label-xs">Uptime 30 d</p>
          <p className="font-mono text-[11px] text-ink">{source.uptime30dPct}%</p>
        </div>
        <div>
          <p className="label-xs">Records 24 h</p>
          <p className="font-mono text-[11px] text-ink">{compactNumber(source.recordsLast24h)}</p>
        </div>
        <div>
          <p className="label-xs">Last sync</p>
          <p className="font-mono text-[11px] text-ink">{relativeTime(source.lastSyncAt)}</p>
        </div>
      </div>

      <p className="mt-2 border-t border-line/60 pt-2 text-[11px] leading-relaxed text-muted">{source.message}</p>
    </motion.article>
  );
}
