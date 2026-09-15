'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Ring, SatelliteScene } from '@/lib/types';
import { cn, seededRandom } from '@/lib/utils';

export type ViewerMode = 'original' | 'processed' | 'mask' | 'overlay';

export const VIEWER_MODES: { id: ViewerMode; label: string }[] = [
  { id: 'original', label: 'Original' },
  { id: 'processed', label: 'Processed' },
  { id: 'mask', label: 'AI mask' },
  { id: 'overlay', label: 'Overlay' }
];

/**
 * Procedural SAR scene renderer.
 *
 * Real imagery will be served by the backend later; until then the viewer draws
 * a deterministic synthetic SAR tile (seeded noise + speckle) so the detection
 * workflow, overlays and measurements can be demonstrated offline.
 */
export function SatelliteViewer({
  scene,
  polygon,
  mode = 'overlay',
  showOverlay = true,
  scanning = false,
  overlayImage,
  className
}: {
  scene: SatelliteScene;
  polygon?: Ring;
  mode?: ViewerMode;
  showOverlay?: boolean;
  scanning?: boolean;
  overlayImage?: string | null;
  className?: string;
}) {
  const seed = useMemo(() => scene.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0), [scene.id]);

  const { path, speckles } = useMemo(() => {
    const rnd = seededRandom(seed);

    let pathStr = '';
    if (polygon && polygon.length > 2) {
      const lats = polygon.map((p) => p[0]);
      const lngs = polygon.map((p) => p[1]);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      const padLat = (maxLat - minLat) * 0.9 || 0.05;
      const padLng = (maxLng - minLng) * 0.9 || 0.05;

      pathStr = polygon
        .map((p, i) => {
          const x = ((p[1] - (minLng - padLng)) / (maxLng - minLng + padLng * 2)) * 320;
          const y = 180 - ((p[0] - (minLat - padLat)) / (maxLat - minLat + padLat * 2)) * 180;
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(' ')
        .concat(' Z');
    }

    const dots = Array.from({ length: 160 }, () => ({
      x: rnd() * 320,
      y: rnd() * 180,
      r: rnd() * 1.1 + 0.2,
      o: rnd() * 0.35 + 0.05
    }));

    return { path: pathStr, speckles: dots };
  }, [polygon, seed]);

  const showSea = mode !== 'mask';
  const showSlick = showOverlay && (mode === 'overlay' || mode === 'mask' || mode === 'processed');

  return (
    <div className={cn('relative overflow-hidden rounded-xl border border-line/80 bg-abyss', className)}>
      {overlayImage ? (
        <div className="relative h-full w-full flex items-center justify-center bg-black/90">
          {/* Real SAR Model Overlay Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={overlayImage}
            alt={`SAR Scene ${scene.id}`}
            className={cn(
              'h-full w-full object-contain transition-all duration-300',
              mode === 'original' && 'grayscale contrast-125 brightness-90',
              mode === 'processed' && 'contrast-150 brightness-110 saturate-150',
              mode === 'mask' && 'contrast-200 saturate-200 hue-rotate-90',
              mode === 'overlay' && 'contrast-110'
            )}
          />

          {/* Grid overlay */}
          {mode !== 'original' && (
            <div className="pointer-events-none absolute inset-0 grid grid-cols-8 grid-rows-4">
              {Array.from({ length: 32 }).map((_, i) => (
                <div key={i} className="border-r border-b border-accent/10" />
              ))}
            </div>
          )}

          {/* Scanning animation */}
          {scanning && (
            <motion.div
              className="pointer-events-none absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-accent/30 to-transparent shadow-[0_0_20px_rgba(34,211,238,0.4)]"
              initial={{ left: '-10%' }}
              animate={{ left: '110%' }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
            />
          )}
        </div>
      ) : (
        <svg viewBox="0 0 320 180" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <filter id={`sar-noise-${seed}`}>
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed={seed % 100} />
              <feColorMatrix type="saturate" values="0" />
              <feComponentTransfer>
                <feFuncA type="linear" slope={mode === 'processed' ? 0.22 : 0.4} />
              </feComponentTransfer>
            </filter>
            <linearGradient id={`sea-${seed}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0a2138" />
              <stop offset="55%" stopColor="#0c2c49" />
              <stop offset="100%" stopColor="#071b2f" />
            </linearGradient>
          </defs>

          <rect width="320" height="180" fill={mode === 'mask' ? '#04101f' : `url(#sea-${seed})`} />

          {showSea && (
            <>
              <rect width="320" height="180" filter={`url(#sar-noise-${seed})`} opacity={0.55} />
              {speckles.map((s, i) => (
                <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#9ec6e8" opacity={s.o} />
              ))}
            </>
          )}

          {/* Range / azimuth reference grid */}
          {mode !== 'original' &&
            Array.from({ length: 8 }).map((_, i) => (
              <line
                key={`gx-${i}`}
                x1={(i + 1) * 40}
                y1={0}
                x2={(i + 1) * 40}
                y2={180}
                stroke="rgba(34,211,238,0.12)"
                strokeWidth={0.5}
              />
            ))}

          {showSlick && path && (
            <>
              <motion.path
                d={path}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                fill={mode === 'mask' ? '#ffffff' : 'rgba(192,38,211,0.42)'}
                stroke={mode === 'mask' ? '#ffffff' : '#f0abfc'}
                strokeWidth={mode === 'mask' ? 0 : 1.2}
              />
              {mode === 'overlay' && (
                <motion.path
                  d={path}
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth={0.8}
                  strokeDasharray="4 3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.4, ease: 'easeInOut' }}
                />
              )}
            </>
          )}

          {scanning && (
            <motion.rect
              width="40"
              height="180"
              fill="url(#scan)"
              initial={{ x: -40 }}
              animate={{ x: 320 }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
              opacity={0.35}
            />
          )}
          <defs>
            <linearGradient id="scan" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
        </svg>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-abyss/90 to-transparent px-3 py-2">
        <span className="font-mono text-[10px] text-accent">{scene.id}</span>
        <span className="font-mono text-[10px] text-muted">
          {scene.mission} · {scene.polarisation} · {scene.resolutionM} m
        </span>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-abyss/90 to-transparent px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{mode}</span>
        <span className="font-mono text-[10px] text-muted">{scene.region}</span>
      </div>
    </div>
  );
}
