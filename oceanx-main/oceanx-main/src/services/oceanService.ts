import type { HeatPoint, VectorSample } from '@/lib/types';
import { buildHeatPoints } from '@/lib/mock/environment';
import { INCIDENTS } from '@/lib/mock/incidents';
import { apiClient } from './apiClient';
import { DEFAULT_MAP_CENTER } from '@/lib/constants';
import { openMeteoService } from './openMeteoService';

export const oceanService = {
  /**
   * Returns hydrodynamic ocean current vector field calibrated with live Open-Meteo Marine API current data.
   */
  currentField: async (center: [number, number] = DEFAULT_MAP_CENTER, region = 'Arabian Sea'): Promise<VectorSample[]> => {
    try {
      return await apiClient.get<VectorSample[]>('/ocean/current-field', {
        latencyMs: 200,
        mock: () => openMeteoService.getCurrentVectorField(center, region)
      });
    } catch {
      return await openMeteoService.getCurrentVectorField(center, region);
    }
  },

  detectionHeatmap: (): Promise<HeatPoint[]> => {
    return apiClient.get<HeatPoint[]>('/ocean/detection-heatmap', {
      latencyMs: 250,
      mock: () => buildHeatPoints(INCIDENTS.map((i) => i.slick.centroid))
    });
  },

  tideSummary: (): Promise<{ station: string; nextHighAt: string; nextLowAt: string; rangeM: number }> => {
    const now = Date.now();
    return apiClient.get<{ station: string; nextHighAt: string; nextLowAt: string; rangeM: number }>('/ocean/tides', {
      latencyMs: 180,
      mock: () => ({
        station: 'Mumbai (Apollo Bandar)',
        nextHighAt: new Date(now + 4 * 3600 * 1000).toISOString(),
        nextLowAt: new Date(now + 10 * 3600 * 1000).toISOString(),
        rangeM: 3.4
      })
    });
  }
};
