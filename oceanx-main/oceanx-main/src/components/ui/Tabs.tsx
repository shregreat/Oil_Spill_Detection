'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TabDef {
  id: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

export function Tabs({
  tabs,
  active,
  onChange,
  className
}: {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto border-b border-line/70 pb-px', className)} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex shrink-0 items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs transition-colors focus-ring',
              isActive ? 'text-accent' : 'text-muted hover:text-ink'
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {tab.label}
            {typeof tab.count === 'number' && (
              <span className="rounded-full bg-panel2 px-1.5 font-mono text-[10px] text-muted">{tab.count}</span>
            )}
            {isActive && (
              <motion.span
                layoutId="tab-underline"
                className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-accent"
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
