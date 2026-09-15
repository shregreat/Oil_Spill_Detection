import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  CircleDot,
  Flame,
  Gauge,
  History,
  Layers,
  Navigation,
  Radar,
  Route,
  Ship,
  Satellite,
  ShieldAlert,
  Waves,
  Wind
} from 'lucide-react';

export type MapLayerId =
  | 'satellite'
  | 'spillPolygon'
  | 'spillCentroid'
  | 'spillConfidence'
  | 'aisVessels'
  | 'vesselTracks'
  | 'suspectVessels'
  | 'hindcast'
  | 'forecast'
  | 'wind'
  | 'currents'
  | 'uncertainty'
  | 'heatmap';

export interface MapLayerDef {
  id: MapLayerId;
  label: string;
  group: 'Imagery' | 'Detection' | 'Vessels' | 'Drift' | 'Environment' | 'Analysis';
  color: string;
  icon: LucideIcon;
  description: string;
  /** Visual style shown in the legend. */
  legend: 'fill' | 'line' | 'dashed' | 'point' | 'arrow' | 'gradient';
}

export const MAP_LAYERS: MapLayerDef[] = [
  {
    id: 'satellite',
    label: 'Satellite Imagery',
    group: 'Imagery',
    color: '#94a3b8',
    icon: Satellite,
    description: 'Sentinel-1 SAR / optical basemap composite',
    legend: 'gradient'
  },
  {
    id: 'spillPolygon',
    label: 'Oil Spill Polygon',
    group: 'Detection',
    color: '#c026d3',
    icon: Layers,
    description: 'AI-segmented slick outline',
    legend: 'fill'
  },
  {
    id: 'spillCentroid',
    label: 'Spill Centroid',
    group: 'Detection',
    color: '#f0abfc',
    icon: CircleDot,
    description: 'Area-weighted centre of the detected slick',
    legend: 'point'
  },
  {
    id: 'spillConfidence',
    label: 'Spill Confidence',
    group: 'Detection',
    color: '#22d3ee',
    icon: Gauge,
    description: 'Per-incident detector confidence halo',
    legend: 'gradient'
  },
  {
    id: 'aisVessels',
    label: 'AIS Vessels',
    group: 'Vessels',
    color: '#38bdf8',
    icon: Ship,
    description: 'Live AIS positions with heading vectors',
    legend: 'point'
  },
  {
    id: 'vesselTracks',
    label: 'Vessel Trajectories',
    group: 'Vessels',
    color: '#7dd3fc',
    icon: Route,
    description: 'Historic AIS tracks for the selected window',
    legend: 'line'
  },
  {
    id: 'suspectVessels',
    label: 'Suspect Vessels',
    group: 'Vessels',
    color: '#f97316',
    icon: ShieldAlert,
    description: 'Vessels ranked by responsibility score',
    legend: 'point'
  },
  {
    id: 'hindcast',
    label: 'Hindcast Trajectory',
    group: 'Drift',
    color: '#a78bfa',
    icon: History,
    description: 'Backward drift used to estimate spill origin',
    legend: 'dashed'
  },
  {
    id: 'forecast',
    label: 'Forward Forecast',
    group: 'Drift',
    color: '#22c55e',
    icon: Navigation,
    description: 'Predicted slick movement up to +72h',
    legend: 'line'
  },
  {
    id: 'wind',
    label: 'Wind Vectors',
    group: 'Environment',
    color: '#fbbf24',
    icon: Wind,
    description: 'Surface wind field (10 m)',
    legend: 'arrow'
  },
  {
    id: 'currents',
    label: 'Ocean Currents',
    group: 'Environment',
    color: '#2dd4bf',
    icon: Waves,
    description: 'Surface current field',
    legend: 'arrow'
  },
  {
    id: 'uncertainty',
    label: 'Uncertainty Areas',
    group: 'Analysis',
    color: '#eab308',
    icon: Radar,
    description: 'Origin and forecast uncertainty envelopes',
    legend: 'fill'
  },
  {
    id: 'heatmap',
    label: 'Detection Heatmap',
    group: 'Analysis',
    color: '#ef4444',
    icon: Flame,
    description: '90-day historical detection density',
    legend: 'gradient'
  }
];

export const MAP_LAYER_GROUPS: MapLayerDef['group'][] = [
  'Imagery',
  'Detection',
  'Vessels',
  'Drift',
  'Environment',
  'Analysis'
];

export const LAYER_BY_ID: Record<MapLayerId, MapLayerDef> = MAP_LAYERS.reduce(
  (acc, layer) => ({ ...acc, [layer.id]: layer }),
  {} as Record<MapLayerId, MapLayerDef>
);

export { Activity };
