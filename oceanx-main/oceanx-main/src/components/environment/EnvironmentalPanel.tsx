'use client';

import { Droplets, Eye, Gauge, Thermometer, Waves, Wind } from 'lucide-react';
import type { EnvironmentSnapshot } from '@/lib/types';
import { cn, compass, formatDateTime } from '@/lib/utils';

function Tile({
  icon: Icon,
  label,
  value,
  hint
}: {
  icon: typeof Wind;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-line/70 bg-deep/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="label-xs">{label}</p>
        <Icon className="h-3.5 w-3.5 text-muted" />
      </div>
      <p className="mt-1.5 font-mono text-sm text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-muted">{hint}</p>}
    </div>
  );
}

export function EnvironmentalPanel({
  environment,
  className,
  columns = 3
}: {
  environment: EnvironmentSnapshot;
  className?: string;
  columns?: 2 | 3 | 4;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <div
        className={cn(
          'grid gap-2',
          columns === 2 && 'grid-cols-2',
          columns === 3 && 'grid-cols-2 lg:grid-cols-3',
          columns === 4 && 'grid-cols-2 lg:grid-cols-4'
        )}
      >
        <Tile
          icon={Wind}
          label="Wind"
          value={`${environment.windSpeedMs} m/s`}
          hint={`${environment.windDirDeg}\u00b0 ${compass(environment.windDirDeg)} \u00b7 gust ${environment.windGustMs}`}
        />
        <Tile
          icon={Waves}
          label="Surface current"
          value={`${environment.currentSpeedMs} m/s`}
          hint={`${environment.currentDirDeg}\u00b0 ${compass(environment.currentDirDeg)}`}
        />
        <Tile
          icon={Gauge}
          label="Waves"
          value={`${environment.waveHeightM} m`}
          hint={`Period ${environment.wavePeriodS} s`}
        />
        <Tile
          icon={Thermometer}
          label="Sea surface temp"
          value={`${environment.seaSurfaceTempC} \u00b0C`}
          hint={`Air ${environment.airTempC} \u00b0C`}
        />
        <Tile
          icon={Eye}
          label="Visibility"
          value={`${environment.visibilityKm} km`}
          hint={environment.weather}
        />
        <Tile icon={Droplets} label="Salinity" value={`${environment.salinityPsu} PSU`} />
      </div>
      <p className="text-[10px] text-muted">Observed {formatDateTime(environment.observedAt)}</p>
    </div>
  );
}
