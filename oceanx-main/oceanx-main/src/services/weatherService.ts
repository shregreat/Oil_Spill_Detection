import type { EnvironmentSnapshot, VectorSample } from '@/lib/types';
import { MET_OCEAN_HISTORY } from '@/lib/mock/environment';
import { apiClient } from './apiClient';
import { DEFAULT_MAP_CENTER } from '@/lib/constants';
import { openMeteoService } from './openMeteoService';

export const weatherService = {
  /**
   * Returns live environmental conditions (wind, waves, currents, temp) powered by Open-Meteo Marine API.
   */
  current: async (region = 'Arabian Sea'): Promise<EnvironmentSnapshot> => {
    try {
      return await apiClient.get<EnvironmentSnapshot>(`/weather/current?region=${encodeURIComponent(region)}`, {
        latencyMs: 150,
        mock: () => openMeteoService.getCurrentConditions(region)
      });
    } catch {
      return await openMeteoService.getCurrentConditions(region);
    }
  },

  /**
   * Returns 48-hour met-ocean hourly history from Open-Meteo Marine API.
   */
  history: async (region = 'Arabian Sea'): Promise<typeof MET_OCEAN_HISTORY> => {
    try {
      return await apiClient.get<typeof MET_OCEAN_HISTORY>('/weather/history', {
        latencyMs: 200,
        mock: () => openMeteoService.getMetOceanHistory(region)
      });
    } catch {
      return await openMeteoService.getMetOceanHistory(region);
    }
  },

  /**
   * Returns animated wind vector field calibrated with real Open-Meteo wind speeds and directions.
   */
  windField: async (center: [number, number] = DEFAULT_MAP_CENTER, region = 'Arabian Sea'): Promise<VectorSample[]> => {
    try {
      return await apiClient.get<VectorSample[]>('/weather/wind-field', {
        latencyMs: 200,
        mock: () => openMeteoService.getWindVectorField(center, region)
      });
    } catch {
      return await openMeteoService.getWindVectorField(center, region);
    }
  }
};
