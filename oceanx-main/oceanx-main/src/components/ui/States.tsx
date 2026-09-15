'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Inbox, Loader2, RefreshCw, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-panel2/60', className)}>
      <span className="scan-line animate-sweep" />
    </div>
  );
}

export function LoadingState({
  label = 'Loading operational data',
  rows = 3,
  className
}: {
  label?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)} role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
        {label}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function StateShell({
  icon: Icon,
  iconClass,
  title,
  description,
  action,
  className
}: {
  icon: LucideIcon;
  iconClass: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line/80 bg-deep/40 px-6 py-10 text-center',
        className
      )}
    >
      <span className={cn('rounded-full border p-2.5', iconClass)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {description && <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted">{description}</p>}
      </div>
      {action}
    </motion.div>
  );
}

export function EmptyState({
  title = 'No records match the current filters',
  description = 'Adjust the filters or widen the time window to see more results.',
  action,
  className
}: {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <StateShell
      icon={Inbox}
      iconClass="border-line bg-panel2 text-muted"
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

export function ErrorState({
  title = 'Unable to load data',
  description,
  onRetry,
  className
}: {
  title?: string;
  description?: ReactNode;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <StateShell
      icon={AlertTriangle}
      iconClass="border-bad/40 bg-bad/10 text-rose-300"
      title={title}
      description={description ?? 'The service did not respond as expected.'}
      action={
        onRetry ? (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        ) : undefined
      }
      className={className}
    />
  );
}

export function SuccessState({
  title = 'Operation complete',
  description,
  action,
  className
}: {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <StateShell
      icon={CheckCircle2}
      iconClass="border-ok/40 bg-ok/10 text-emerald-300"
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

/** Inline toast-style banner for success / error feedback after an action. */
export function InlineNotice({
  tone,
  children,
  className
}: {
  tone: 'success' | 'error' | 'info' | 'warning';
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    success: 'border-ok/40 bg-ok/10 text-emerald-200',
    error: 'border-bad/40 bg-bad/10 text-rose-200',
    info: 'border-accent/40 bg-accent/10 text-cyan-100',
    warning: 'border-warn/40 bg-warn/10 text-amber-200'
  } as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-lg border px-3 py-2 text-xs', tones[tone], className)}
      role="status"
    >
      {children}
    </motion.div>
  );
}
