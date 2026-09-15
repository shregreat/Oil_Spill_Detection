'use client';

import { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { MAP_LAYERS, type MapLayerId } from '@/lib/mapLayers';
import { cn } from '@/lib/utils';

function Swatch({ color, legend }: { color: string; legend: string }) {
  if (legend === 'line') return <span className="h-0.5 w-5 rounded-full" style={{ background: color }} />;
  if (legend === 'dashed')
    return (
      <span
        className="h-0.5 w-5"
        style={{ backgroundImage: `repeating-linear-gradient(to right, ${color} 0 4px, transparent 4px 7px)` }}
      />
    );
  if (legend === 'point')
    return <span className="h-2.5 w-2.5 rounded-full border" style={{ borderColor: color, background: `${color}55` }} />;
  if (legend === 'arrow')
    return (
      <svg viewBox="0 0 24 24" className="h-3 w-3">
        <line x1="12" y1="21" x2="12" y2="6" stroke={color} strokeWidth="2" />
        <path d="M12 3 L16 9 L8 9 Z" fill={color} />
      </svg>
    );
  if (legend === 'gradient')
    return (
      <span
        className="h-2.5 w-5 rounded-sm"
        style={{ background: `linear-gradient(to right, transparent, ${color})` }}
      />
    );
  return <span className="h-2.5 w-5 rounded-sm border" style={{ borderColor: color, background: `${color}40` }} />;
}

export function MapLegend({
  visible,
  className,
  collapsible = true
}: {
  visible?: Record<MapLayerId, boolean>;
  className?: string;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const items = MAP_LAYERS.filter((l) => (visible ? visible[l.id] : true));

  return (
    <div className={cn('w-56 rounded-xl border border-line/90 bg-panel/90 shadow-panel backdrop-blur', className)}>
      <button
        type="button"
        onClick={() => collapsible && setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 focus-ring"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-ink">
          <Info className="h-3.5 w-3.5 text-accent" />
          Legend
        </span>
        {collapsible && (
          <ChevronDown className={cn('h-3.5 w-3.5 text-muted transition-transform', open && 'rotate-180')} />
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="max-h-56 space-y-1.5 overflow-y-auto border-t border-line/70 px-3 py-2.5"
          >
            {items.length === 0 && <li className="text-[11px] text-muted">All layers hidden</li>}
            {items.map((layer) => (
              <li key={layer.id} className="flex items-center gap-2">
                <Swatch color={layer.color} legend={layer.legend} />
                <span className="truncate text-[11px] text-muted">{layer.label}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
