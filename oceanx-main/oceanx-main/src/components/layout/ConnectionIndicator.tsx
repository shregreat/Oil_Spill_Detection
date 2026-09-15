'use client';

import { motion } from 'framer-motion';
import { Radio, RefreshCw, WifiOff } from 'lucide-react';
import type { ConnectionState } from '@/lib/types';
import { cn } from '@/lib/utils';

const STATES: Record<ConnectionState, { label: string; className: string; dot: string }> = {
  LIVE: { label: 'LIVE', className: 'border-ok/50 bg-ok/12 text-emerald-300', dot: 'bg-ok' },
  CONNECTING: { label: 'CONNECTING', className: 'border-warn/50 bg-warn/12 text-amber-300', dot: 'bg-warn' },
  OFFLINE: { label: 'OFFLINE', className: 'border-bad/50 bg-bad/12 text-rose-300', dot: 'bg-bad' }
};

export function ConnectionIndicator({
  state,
  eventCount,
  onReconnect,
  compact = false,
  className
}: {
  state: ConnectionState;
  eventCount?: number;
  onReconnect?: () => void;
  compact?: boolean;
  className?: string;
}) {
  const cfg = STATES[state];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wider',
        cfg.className,
        className
      )}
      title={`Realtime stream: ${cfg.label}`}
    >
      <span className="relative flex h-2 w-2 items-center justify-center">
        <span className={cn('h-2 w-2 rounded-full', cfg.dot)} />
        {state === 'LIVE' && (
          <motion.span
            className="absolute h-2 w-2 rounded-full bg-ok"
            animate={{ scale: [1, 2.4], opacity: [0.7, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
      </span>

      {state === 'OFFLINE' ? <WifiOff className="h-3 w-3" /> : <Radio className="h-3 w-3" />}
      {!compact && cfg.label}
      {!compact && typeof eventCount === 'number' && eventCount > 0 && (
        <span className="font-mono text-[10px] opacity-80">{eventCount} evt</span>
      )}

      {onReconnect && state !== 'LIVE' && (
        <button
          type="button"
          onClick={onReconnect}
          aria-label="Reconnect realtime stream"
          className="rounded-full p-0.5 transition-transform hover:rotate-90 focus-ring"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
