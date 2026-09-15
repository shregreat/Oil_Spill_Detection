'use client';

import { motion } from 'framer-motion';
import { Check, Loader2, Radar, ScanLine, Upload } from 'lucide-react';
import type { ProcessingStage } from '@/lib/types';
import { cn } from '@/lib/utils';

const STEPS: { id: ProcessingStage; label: string; detail: string; icon: typeof Upload }[] = [
  { id: 'queued', label: 'Queued', detail: 'Scene accepted, awaiting a worker slot', icon: Upload },
  { id: 'processing', label: 'Processing', detail: 'Calibration, speckle filtering and land masking', icon: ScanLine },
  { id: 'detection', label: 'Detection', detail: 'Segmentation network inferring the oil mask', icon: Radar },
  { id: 'complete', label: 'Complete', detail: 'Slick vectorised and measurements published', icon: Check }
];

export const PROCESSING_STEPS = STEPS;

export function ProcessingIndicator({
  stage,
  progress,
  className,
  compact = false
}: {
  stage: ProcessingStage;
  progress?: number;
  className?: string;
  compact?: boolean;
}) {
  const failed = stage === 'failed';
  const activeIndex = failed ? 1 : STEPS.findIndex((s) => s.id === stage);
  const ratio = typeof progress === 'number' ? progress : (activeIndex + 1) / STEPS.length;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="relative h-1 overflow-hidden rounded-full bg-deep">
        <motion.div
          className={cn('h-full rounded-full', failed ? 'bg-bad' : 'bg-gradient-to-r from-accent/70 to-accent')}
          initial={{ width: 0 }}
          animate={{ width: `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      <ol className={cn('grid gap-2', compact ? 'grid-cols-4' : 'grid-cols-2 sm:grid-cols-4')}>
        {STEPS.map((step, idx) => {
          const done = !failed && idx < activeIndex;
          const active = !failed && idx === activeIndex;
          const Icon = step.icon;
          return (
            <li
              key={step.id}
              className={cn(
                'rounded-lg border px-3 py-2 transition-colors',
                done && 'border-ok/40 bg-ok/8',
                active && 'border-accent/60 bg-accent/10',
                !done && !active && 'border-line/70 bg-deep/40'
              )}
            >
              <div className="flex items-center gap-2">
                {active && stage !== 'complete' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                ) : (
                  <Icon
                    className={cn(
                      'h-3.5 w-3.5',
                      done ? 'text-emerald-300' : active ? 'text-accent' : 'text-muted'
                    )}
                  />
                )}
                <span
                  className={cn(
                    'text-[11px] font-semibold uppercase tracking-wider',
                    done ? 'text-emerald-300' : active ? 'text-accent' : 'text-muted'
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!compact && <p className="mt-1 text-[11px] leading-snug text-muted">{step.detail}</p>}
            </li>
          );
        })}
      </ol>

      {failed && (
        <p className="text-[11px] text-rose-300">
          Processing failed during preprocessing. The scene can be re-queued from the scene list.
        </p>
      )}
    </div>
  );
}
