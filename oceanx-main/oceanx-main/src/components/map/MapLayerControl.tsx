'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Layers, RotateCcw } from 'lucide-react';
import { MAP_LAYERS, MAP_LAYER_GROUPS, type MapLayerId } from '@/lib/mapLayers';
import { DEFAULT_LAYER_STATE } from '@/lib/constants';
import { cn } from '@/lib/utils';

export interface MapLayerControlProps {
  value: Record<MapLayerId, boolean>;
  onChange: (next: Record<MapLayerId, boolean>) => void;
  className?: string;
  collapsible?: boolean;
}

export function MapLayerControl({ value, onChange, className, collapsible = true }: MapLayerControlProps) {
  const [open, setOpen] = useState(!collapsible);
  const activeCount = Object.values(value).filter(Boolean).length;

  const toggle = (id: MapLayerId) => onChange({ ...value, [id]: !value[id] });

  return (
    <div className={cn('w-64 rounded-xl border border-line/90 bg-panel/90 shadow-panel backdrop-blur', className)}>
      <button
        type="button"
        onClick={() => collapsible && setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 focus-ring"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-ink">
          <Layers className="h-3.5 w-3.5 text-accent" />
          Map layers
          <span className="rounded-full bg-panel2 px-1.5 font-mono text-[10px] text-muted">{activeCount}</span>
        </span>
        {collapsible && (
          <ChevronDown className={cn('h-3.5 w-3.5 text-muted transition-transform', open && 'rotate-180')} />
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="max-h-[52vh] space-y-3 overflow-y-auto border-t border-line/70 px-3 py-3">
              {MAP_LAYER_GROUPS.map((group) => (
                <div key={group}>
                  <p className="label-xs">{group}</p>
                  <div className="mt-1.5 space-y-1">
                    {MAP_LAYERS.filter((l) => l.group === group).map((layer) => {
                      const Icon = layer.icon;
                      const on = value[layer.id];
                      return (
                        <label
                          key={layer.id}
                          className={cn(
                            'flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors',
                            on ? 'border-accent/40 bg-accent/8' : 'border-transparent hover:bg-panel2/60'
                          )}
                          title={layer.description}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggle(layer.id)}
                            className="h-3.5 w-3.5 rounded border-line bg-deep accent-cyan-400"
                          />
                          <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: on ? layer.color : undefined }} />
                          <span className={cn('truncate text-[11px]', on ? 'text-ink' : 'text-muted')}>
                            {layer.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-line/70 px-3 py-2">
              <button
                type="button"
                onClick={() => onChange({ ...DEFAULT_LAYER_STATE })}
                className="inline-flex items-center gap-1.5 text-[11px] text-muted transition-colors hover:text-accent focus-ring"
              >
                <RotateCcw className="h-3 w-3" />
                Reset to default layers
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
