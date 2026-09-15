'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { MapCanvasProps } from './MapCanvas';

/**
 * Leaflet touches `window` on import, so the canvas is loaded client-side only.
 * Every page uses this wrapper rather than importing MapCanvas directly.
 */
const MapCanvas = dynamic(() => import('./MapCanvas'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-abyss grid-backdrop">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
        Initialising geospatial canvas
      </div>
    </div>
  )
});

export type MapViewProps = MapCanvasProps;

export function MapView(props: MapViewProps) {
  return <MapCanvas {...props} />;
}
