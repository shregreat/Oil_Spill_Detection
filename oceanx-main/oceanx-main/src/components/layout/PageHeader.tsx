import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  className
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        {breadcrumb && <div className="mb-1 text-[11px] text-muted">{breadcrumb}</div>}
        <h1 className="text-lg font-semibold tracking-tight text-ink lg:text-xl">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
