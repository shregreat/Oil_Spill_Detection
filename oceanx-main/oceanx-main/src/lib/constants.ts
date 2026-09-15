import type { MapLayerId } from './mapLayers';

export const APP_NAME = 'OceanX';
export const APP_TAGLINE = 'Maritime Oil Spill Intelligence & Vessel Attribution';
export const PS_REFERENCE = 'SIH 2026 \u00b7 PS 26143';

export const DEFAULT_MAP_CENTER: [number, number] = [19.42, 71.6];
export const DEFAULT_MAP_ZOOM = 8;

export const BASEMAPS = {
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagery \u00a9 Esri, Maxar, Earthstar Geographics'
  },
  dark: {
    label: 'Nautical Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '\u00a9 OpenStreetMap contributors \u00a9 CARTO'
  }
} as const;

export type BasemapId = keyof typeof BASEMAPS;

export const DEFAULT_LAYER_STATE: Record<MapLayerId, boolean> = {
  satellite: true,
  spillPolygon: true,
  spillCentroid: true,
  spillConfidence: true,
  aisVessels: true,
  vesselTracks: true,
  suspectVessels: true,
  hindcast: true,
  forecast: true,
  wind: false,
  currents: false,
  uncertainty: true,
  heatmap: false
};

export const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'] as const;

export const FORECAST_HORIZONS = [1, 3, 6, 12, 24, 48, 72] as const;
