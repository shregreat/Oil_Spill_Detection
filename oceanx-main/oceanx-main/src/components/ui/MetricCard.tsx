'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface MetricCardProps {
  label: string;
  value: ReactNode;
  unit?: string;
  delta?: number;
  deltaSuffix?: string;
  hint?: ReactNode;
  icon?: LucideIcon;
  href?: string;
  tone?: 'default' | 'critical' | 'warning' | 'positive' | 'accent';
  index?: number;
  footer?: ReactNode;
}

const TONES = {
  default: 'border-line/80 hover:border-accent/40',
  critical: 'border-bad/40 hover:border-bad/70',
  warning: 'border-warn/40 hover:border-warn/70',
  positive: 'border-ok/40 hover:border-ok/70',
  accent: 'border-accent/40 hover:border-accent/70'
} as const;

const ICON_TONES = {
  default: 'text-muted',
  critical: 'text-rose-300',
  warning: 'text-amber-300',
  positive: 'text-emerald-300',
  accent: 'text-accent'
} as const;

export function MetricCard({
  label,
  value,
  unit,
  delta,
  deltaSuffix = 'vs 24h',
  hint,
  icon: Icon,
  href,
  tone = 'default',
  index = 0,
  footer
}: MetricCardProps) {
  const positive = (delta ?? 0) >= 0;

  const body = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: Math.min(index * 0.04, 0.32), ease: 'easeOut' }}
      className={cn(
        'group relative h-full overflow-hidden rounded-xl border bg-panel/70 p-4 shadow-panel transition-colors',
        TONES[tone]
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="label-xs leading-tight">{label}</p>
        {Icon && <Icon className={cn('h-4 w-4 shrink-0', ICON_TONES[tone])} aria-hidden />}
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-mono text-2xl font-semibold tracking-tight text-ink">{value}</span>
        {unit && <span className="text-xs text-muted">{unit}</span>}
      </div>

      {typeof delta === 'number' && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px]">
          <span className={cn('inline-flex items-center gap-0.5', positive ? 'text-emerald-300' : 'text-rose-300')}>
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {positive ? '+' : ''}
            {delta}
          </span>
          <span className="text-muted">{deltaSuffix}</span>
        </div>
      )}

      {hint && <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted">{hint}</p>}
      {footer && <div className="mt-3">{footer}</div>}

      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </motion.div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full focus-ring rounded-xl">
        {body}
      </Link>
    );
  }
  return body;
}
