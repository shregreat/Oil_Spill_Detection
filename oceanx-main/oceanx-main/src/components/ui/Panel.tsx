import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PanelProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Removes the default body padding - useful for maps and tables. */
  flush?: boolean;
}

export function Panel({ title, subtitle, actions, children, className, bodyClassName, flush }: PanelProps) {
  return (
    <section className={cn('panel flex flex-col overflow-hidden', className)}>
      {(title || actions) && (
        <header className="panel-header">
          <div className="min-w-0">
            {title && <h2 className="truncate text-sm font-semibold tracking-tight text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 truncate text-xs text-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn('min-h-0 flex-1', flush ? '' : 'p-4', bodyClassName)}>{children}</div>
    </section>
  );
}

export function KeyValue({
  label,
  value,
  hint,
  className
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border border-line/60 bg-deep/50 px-3 py-2', className)}>
      <p className="label-xs">{label}</p>
      <p className="mt-1 font-mono text-sm text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

export function KeyValueGrid({ children, columns = 2 }: { children: ReactNode; columns?: 2 | 3 | 4 }) {
  return (
    <div
      className={cn(
        'grid gap-2',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        columns === 4 && 'grid-cols-2 lg:grid-cols-4'
      )}
    >
      {children}
    </div>
  );
}
