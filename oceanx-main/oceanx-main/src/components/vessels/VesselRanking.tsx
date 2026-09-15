'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, MinusCircle } from 'lucide-react';
import type { SuspectVessel } from '@/lib/types';
import { cn, pct } from '@/lib/utils';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';

const HEADERS = [
  'Rank',
  'Vessel',
  'MMSI',
  'IMO',
  'Score',
  'Confidence',
  'Distance',
  'Time diff',
  'Traj. corr.',
  'Behaviour'
];

function scoreTone(score: number) {
  if (score >= 75) return 'text-rose-300';
  if (score >= 50) return 'text-orange-300';
  if (score >= 30) return 'text-amber-200';
  return 'text-muted';
}

export function VesselRanking({
  suspects,
  selectedMmsi,
  onSelect,
  className
}: {
  suspects: SuspectVessel[];
  selectedMmsi?: string | null;
  onSelect?: (mmsi: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full min-w-[860px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line/80">
            {HEADERS.map((h) => (
              <th key={h} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {suspects.map((s) => (
            <tr
              key={s.mmsi}
              onClick={() => onSelect?.(s.mmsi)}
              className={cn(
                'cursor-pointer border-b border-line/50 transition-colors',
                s.mmsi === selectedMmsi ? 'bg-accent/10' : 'hover:bg-panel2/50'
              )}
            >
              <td className="px-3 py-2">
                <span
                  className={cn(
                    'grid h-6 w-6 place-items-center rounded-md border font-mono text-[11px]',
                    s.rank === 1 ? 'border-bad/50 bg-bad/15 text-rose-300' : 'border-line bg-deep text-muted'
                  )}
                >
                  {s.rank}
                </span>
              </td>
              <td className="px-3 py-2">
                <p className="text-xs font-medium text-ink">{s.name}</p>
                <p className="text-[10px] text-muted">
                  {s.type} · {s.flag}
                </p>
              </td>
              <td className="px-3 py-2 font-mono text-[11px] text-muted">{s.mmsi}</td>
              <td className="px-3 py-2 font-mono text-[11px] text-muted">{s.imo}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={cn('font-mono text-xs font-semibold', scoreTone(s.responsibilityScore))}>
                    {s.responsibilityScore}
                  </span>
                  <span className="h-1 w-14 overflow-hidden rounded-full bg-deep">
                    <motion.span
                      className="block h-full rounded-full bg-gradient-to-r from-sev-medium to-sev-critical"
                      initial={{ width: 0 }}
                      animate={{ width: `${s.responsibilityScore}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                    />
                  </span>
                </div>
              </td>
              <td className="px-3 py-2">
                <ConfidenceBadge confidence={s.confidence} />
              </td>
              <td className="px-3 py-2 font-mono text-[11px] text-ink">{s.distanceKm} km</td>
              <td className="px-3 py-2 font-mono text-[11px] text-ink">{s.timeDiffMin} min</td>
              <td className="px-3 py-2 font-mono text-[11px] text-ink">{pct(s.trajectoryCorrelation, 0)}</td>
              <td className="px-3 py-2 font-mono text-[11px] text-ink">{pct(s.behaviourScore, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EvidencePanel({ suspect }: { suspect: SuspectVessel }) {
  const icons = {
    supporting: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />,
    neutral: <MinusCircle className="h-3.5 w-3.5 text-muted" />,
    contradicting: <AlertTriangle className="h-3.5 w-3.5 text-rose-300" />
  } as const;

  return (
    <div className="space-y-2">
      {suspect.evidence.map((e) => (
        <motion.div
          key={e.id}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-lg border border-line/70 bg-deep/50 p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              {icons[e.verdict]}
              <p className="text-[11px] font-semibold text-ink">{e.label}</p>
            </div>
            <span className="shrink-0 font-mono text-[10px] text-muted">w {e.weight.toFixed(2)}</span>
          </div>
          <p className="mt-1.5 pl-5 text-[11px] leading-relaxed text-muted">{e.detail}</p>
        </motion.div>
      ))}

      {suspect.anomalies.length > 0 && (
        <div className="rounded-lg border border-sev-high/40 bg-sev-high/8 p-3">
          <p className="text-[11px] font-semibold text-orange-300">Behavioural anomalies</p>
          <ul className="mt-1.5 space-y-1">
            {suspect.anomalies.map((a) => (
              <li key={a} className="flex gap-2 text-[11px] text-muted">
                <span className="text-orange-300">•</span>
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
