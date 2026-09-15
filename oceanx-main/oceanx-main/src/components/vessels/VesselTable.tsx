'use client';

import type { Vessel } from '@/lib/types';
import { cn, compass, relativeTime } from '@/lib/utils';

export function VesselTable({
  vessels,
  selectedMmsi,
  onSelect,
  className
}: {
  vessels: Vessel[];
  selectedMmsi?: string | null;
  onSelect?: (mmsi: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line/80">
            {['Vessel', 'MMSI', 'IMO', 'Type', 'Speed', 'Heading', 'Course', 'Last report'].map((h) => (
              <th key={h} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vessels.map((v) => (
            <tr
              key={v.mmsi}
              onClick={() => onSelect?.(v.mmsi)}
              className={cn(
                'cursor-pointer border-b border-line/50 transition-colors',
                v.mmsi === selectedMmsi ? 'bg-accent/10' : 'hover:bg-panel2/50'
              )}
            >
              <td className="px-3 py-2">
                <p className="text-xs font-medium text-ink">{v.name}</p>
                <p className="text-[10px] text-muted">
                  {v.flag} · {v.operator}
                </p>
              </td>
              <td className="px-3 py-2 font-mono text-[11px] text-muted">{v.mmsi}</td>
              <td className="px-3 py-2 font-mono text-[11px] text-muted">{v.imo}</td>
              <td className="px-3 py-2 text-[11px] text-muted">{v.type}</td>
              <td className="px-3 py-2 font-mono text-[11px] text-ink">{v.speedKn} kn</td>
              <td className="px-3 py-2 font-mono text-[11px] text-muted">{v.headingDeg}°</td>
              <td className="px-3 py-2 font-mono text-[11px] text-muted">
                {v.courseDeg}° {compass(v.courseDeg)}
              </td>
              <td className="px-3 py-2 text-[11px] text-muted">{relativeTime(v.timestamp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
