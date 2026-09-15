import { cn, confidenceTier, pct } from '@/lib/utils';

const TIERS = {
  high: { label: 'High confidence', className: 'border-ok/50 bg-ok/12 text-emerald-300', bar: 'bg-ok' },
  medium: { label: 'Moderate confidence', className: 'border-warn/50 bg-warn/12 text-amber-300', bar: 'bg-warn' },
  low: { label: 'Low confidence', className: 'border-bad/50 bg-bad/12 text-rose-300', bar: 'bg-bad' }
} as const;

export function ConfidenceBadge({
  confidence,
  showLabel = false,
  className
}: {
  confidence: number;
  showLabel?: boolean;
  className?: string;
}) {
  const tier = TIERS[confidenceTier(confidence)];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px]',
        tier.className,
        className
      )}
      title={tier.label}
    >
      {pct(confidence, 0)}
      {showLabel && <span className="font-sans">{tier.label}</span>}
    </span>
  );
}

/** Horizontal confidence meter used in detail panels and tables. */
export function ConfidenceMeter({
  confidence,
  label = 'Detection confidence',
  className
}: {
  confidence: number;
  label?: string;
  className?: string;
}) {
  const tier = TIERS[confidenceTier(confidence)];
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between">
        <span className="label-xs">{label}</span>
        <span className="font-mono text-xs text-ink">{pct(confidence, 1)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-deep">
        <div
          className={cn('h-full rounded-full transition-all duration-700', tier.bar)}
          style={{ width: `${Math.round(confidence * 100)}%` }}
        />
      </div>
      <p className="text-[11px] text-muted">{tier.label}</p>
    </div>
  );
}
