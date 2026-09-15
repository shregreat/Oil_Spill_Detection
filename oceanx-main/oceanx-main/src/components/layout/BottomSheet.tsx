'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronUp, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Mobile-first bottom sheet. On small screens the map stays full-bleed and data
 * panels are presented here instead of being squeezed into the desktop layout.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  peekLabel = 'Show details',
  className
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  peekLabel?: string;
  className?: string;
}) {
  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-between gap-2 rounded-xl border border-accent/40 bg-panel/95 px-4 py-3 text-xs font-semibold text-ink shadow-panel backdrop-blur focus-ring lg:hidden"
        >
          {peekLabel}
          <ChevronUp className="h-4 w-4 text-accent" />
        </button>
      )}

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => onOpenChange(false)}
              className="fixed inset-0 z-40 bg-abyss/70 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className={cn(
                'fixed inset-x-0 bottom-0 z-50 max-h-[84vh] overflow-hidden rounded-t-2xl border-t border-line bg-deep shadow-panel lg:hidden',
                className
              )}
              role="dialog"
              aria-modal
              aria-label={title}
            >
              <div className="flex items-center justify-between gap-3 border-b border-line/80 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{title}</p>
                  {subtitle && <p className="truncate text-[11px] text-muted">{subtitle}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  aria-label="Close panel"
                  className="rounded-lg p-1.5 text-muted transition-colors hover:text-ink focus-ring"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">{children}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
