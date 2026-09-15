'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, MapPin, Ruler, Ship, Waves } from 'lucide-react';
import type { Incident } from '@/lib/types';
import { cn, formatDateTime, relativeTime } from '@/lib/utils';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { IncidentStatusBadge, SeverityBadge } from '@/components/ui/StatusBadge';

export function IncidentCard({
  incident,
  selected,
  onSelect,
  index = 0,
  compact = false
}: {
  incident: Incident;
  selected?: boolean;
  onSelect?: (id: string) => void;
  index?: number;
  compact?: boolean;
}) {
  const suspect = incident.suspects[0];

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.04, 0.3) }}
      onClick={() => onSelect?.(incident.id)}
      className={cn(
        'group cursor-pointer rounded-xl border bg-panel/70 p-3 transition-colors',
        selected ? 'border-accent/70 shadow-glow' : 'border-line/80 hover:border-accent/40'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-accent">{incident.id}</p>
          <p className="mt-0.5 truncate text-xs font-semibold text-ink">{incident.title}</p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted">
            <MapPin className="h-3 w-3 shrink-0" />
            {incident.region}
          </p>
        </div>
        <ConfidenceBadge confidence={incident.detection.confidence} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <SeverityBadge severity={incident.severity} />
        <IncidentStatusBadge status={incident.status} />
      </div>

      {!compact && (
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-line/60 bg-deep/50 px-2 py-1.5">
            <p className="label-xs">Area</p>
            <p className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-ink">
              <Waves className="h-3 w-3 text-muted" />
              {incident.slick.areaKm2}
            </p>
          </div>
          <div className="rounded-lg border border-line/60 bg-deep/50 px-2 py-1.5">
            <p className="label-xs">Length</p>
            <p className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-ink">
              <Ruler className="h-3 w-3 text-muted" />
              {incident.slick.lengthKm}
            </p>
          </div>
          <div className="rounded-lg border border-line/60 bg-deep/50 px-2 py-1.5">
            <p className="label-xs">Suspects</p>
            <p className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-ink">
              <Ship className="h-3 w-3 text-muted" />
              {incident.suspects.length}
            </p>
          </div>
        </div>
      )}

      {suspect && !compact && (
        <p className="mt-2 truncate text-[11px] text-muted">
          Top suspect <span className="text-ink">{suspect.name}</span> · score{' '}
          <span className="font-mono text-orange-300">{suspect.responsibilityScore}/100</span>
        </p>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line/60 pt-2">
        <span className="truncate text-[10px] text-muted" title={formatDateTime(incident.detectedAt)}>
          Detected {relativeTime(incident.detectedAt)}
        </span>
        <Link
          href={`/incidents/${incident.id}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-[11px] text-accent opacity-80 transition-opacity hover:opacity-100 focus-ring"
        >
          Investigate <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </motion.article>
  );
}
