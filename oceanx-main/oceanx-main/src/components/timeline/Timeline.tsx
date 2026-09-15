'use client';

import { motion } from 'framer-motion';
import { Check, Clock, Loader2, X } from 'lucide-react';
import type { TimelineEvent } from '@/lib/types';
import { cn, formatDateTime, relativeTime } from '@/lib/utils';

const STATUS = {
  complete: { icon: Check, className: 'border-ok/50 bg-ok/12 text-emerald-300', line: 'bg-ok/40' },
  running: { icon: Loader2, className: 'border-accent/60 bg-accent/12 text-accent', line: 'bg-accent/40' },
  pending: { icon: Clock, className: 'border-line bg-panel2 text-muted', line: 'bg-line' },
  failed: { icon: X, className: 'border-bad/50 bg-bad/12 text-rose-300', line: 'bg-bad/40' }
} as const;

export function Timeline({
  events,
  className,
  compact = false
}: {
  events: TimelineEvent[];
  className?: string;
  compact?: boolean;
}) {
  return (
    <ol className={cn('relative space-y-3 pl-8', className)}>
      <span className="absolute bottom-2 left-[13px] top-2 w-px bg-line/70" aria-hidden />

      {events.map((event, index) => {
        const cfg = STATUS[event.status];
        const Icon = cfg.icon;
        return (
          <motion.li
            key={event.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: Math.min(index * 0.06, 0.5) }}
            className="relative"
          >
            <span
              className={cn(
                'absolute -left-8 top-1 grid h-[26px] w-[26px] place-items-center rounded-full border',
                cfg.className
              )}
            >
              <Icon className={cn('h-3.5 w-3.5', event.status === 'running' && 'animate-spin')} />
            </span>

            <div className="rounded-xl border border-line/80 bg-panel/70 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-ink">{event.title}</p>
                <span className="font-mono text-[10px] text-muted" title={formatDateTime(event.timestamp)}>
                  {formatDateTime(event.timestamp)} · {relativeTime(event.timestamp)}
                </span>
              </div>

              {!compact && <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{event.detail}</p>}

              <div className="mt-2 flex flex-wrap gap-1.5">
                {event.metrics.map((m) => (
                  <span
                    key={m.label}
                    className="rounded-md border border-line/60 bg-deep/60 px-2 py-0.5 text-[10px] text-muted"
                  >
                    {m.label}: <span className="font-mono text-ink">{m.value}</span>
                  </span>
                ))}
                <span className="rounded-md border border-line/60 bg-deep/60 px-2 py-0.5 text-[10px] text-muted">
                  Duration: <span className="font-mono text-ink">{event.durationSec}s</span>
                </span>
              </div>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
