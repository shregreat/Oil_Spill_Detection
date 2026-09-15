import type { HeatPoint, VectorSample } from '@/lib/types';
import { buildHeatPoints, buildVectorField, REGIONAL_CONDITIONS } from '@/lib/mock/environment';
import { INCIDENTS } from '@/lib/mock/incidents';
import { apiClient } from './apiClient';
import { DEFAULT_MAP_CENTER } from '@/lib/constants';

export const oceanService = {
  currentField(center: [number, number] = DEFAULT_MAP_CENTER, region = 'Arabian Sea') {
    const snapshot = REGIONAL_CONDITIONS[region] ?? REGIONAL_CONDITIONS['Arabian Sea'];
    return apiClient.get<VectorSample[]>('/ocean/current-field', {
      latencyMs: 300,
      mock: () => buildVectorField(center, snapshot.currentSpeedMs * 10, snapshot.currentDirDeg, 29)
    });
  },

  detectionHeatmap() {
    return apiClient.get<HeatPoint[]>('/ocean/detection-heatmap', {
      latencyMs: 340,
      mock: () => buildHeatPoints(INCIDENTS.map((i) => i.slick.centroid))
    });
  },

  tideSummary() {
    return apiClient.get<{ station: string; nextHighAt: string; nextLowAt: string; rangeM: number }>('/ocean/tides', {
      latencyMs: 220,
      mock: () => ({
        station: 'Mumbai (Apollo Bandar)',
        nextHighAt: '2026-09-12T13:24:00.000Z',
        nextLowAt: '2026-09-12T19:48:00.000Z',
        rangeM: 3.4
      })
    });
  }
};
