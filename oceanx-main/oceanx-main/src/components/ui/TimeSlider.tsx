'use client';

import { useEffect } from 'react';
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TimeSliderProps {
  steps: { label: string; sublabel?: string }[];
  index: number;
  onChange: (index: number) => void;
  playing?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  intervalMs?: number;
  title?: string;
  className?: string;
}

/**
 * Shared timeline scrubber used by the incident, forecast and drift views.
 * Playback loops through the provided steps at a fixed cadence.
 */
export function TimeSlider({
  steps,
  index,
  onChange,
  playing = false,
  onPlayingChange,
  intervalMs = 1400,
  title = 'Forecast horizon',
  className
}: TimeSliderProps) {
  useEffect(() => {
    if (!playing || steps.length < 2) return;
    const timer = setInterval(() => onChange((index + 1) % steps.length), intervalMs);
    return () => clearInterval(timer);
  }, [playing, index, steps.length, intervalMs, onChange]);

  const current = steps[index];

  return (
    <div className={cn('rounded-xl border border-line/80 bg-panel/70 p-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="label-xs">{title}</p>
          <p className="mt-0.5 font-mono text-sm text-ink">{current?.label}</p>
          {current?.sublabel && <p className="text-[11px] text-muted">{current.sublabel}</p>}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous step"
            onClick={() => onChange(Math.max(0, index - 1))}
            className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-ink focus-ring"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </button>
          {onPlayingChange && (
            <button
              type="button"
              aria-label={playing ? 'Pause animation' : 'Play animation'}
              onClick={() => onPlayingChange(!playing)}
              className={cn(
                'rounded-lg border p-1.5 transition-colors focus-ring',
                playing ? 'border-accent/60 bg-accent/15 text-accent' : 'border-line text-muted hover:text-ink'
              )}
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
          )}
          <button
            type="button"
            aria-label="Next step"
            onClick={() => onChange(Math.min(steps.length - 1, index + 1))}
            className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-ink focus-ring"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={Math.max(0, steps.length - 1)}
        step={1}
        value={index}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={title}
        className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-deep accent-cyan-400 focus-ring"
      />

      <div className="mt-2 flex flex-wrap gap-1">
        {steps.map((step, i) => (
          <button
            key={step.label}
            type="button"
            onClick={() => onChange(i)}
            className={cn(
              'rounded-md px-2 py-0.5 font-mono text-[10px] transition-colors focus-ring',
              i === index ? 'bg-accent/20 text-accent' : 'text-muted hover:bg-panel2 hover:text-ink'
            )}
          >
            {step.label}
          </button>
        ))}
      </div>
    </div>
  );
}
