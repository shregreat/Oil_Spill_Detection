import type { EnvironmentSnapshot, VectorSample } from '@/lib/types';
import { buildVectorField, MET_OCEAN_HISTORY, REGIONAL_CONDITIONS } from '@/lib/mock/environment';
import { apiClient } from './apiClient';
import { DEFAULT_MAP_CENTER } from '@/lib/constants';

export const weatherService = {
  current(region = 'Arabian Sea') {
    return apiClient.get<EnvironmentSnapshot>(`/weather/current?region=${encodeURIComponent(region)}`, {
      latencyMs: 240,
      mock: () => REGIONAL_CONDITIONS[region] ?? REGIONAL_CONDITIONS['Arabian Sea']
    });
  },

  history() {
    return apiClient.get<typeof MET_OCEAN_HISTORY>('/weather/history', {
      latencyMs: 300,
      mock: () => MET_OCEAN_HISTORY
    });
  },

  windField(center: [number, number] = DEFAULT_MAP_CENTER, region = 'Arabian Sea') {
    const snapshot = REGIONAL_CONDITIONS[region] ?? REGIONAL_CONDITIONS['Arabian Sea'];
    return apiClient.get<VectorSample[]>('/weather/wind-field', {
      latencyMs: 280,
      mock: () => buildVectorField(center, snapshot.windSpeedMs, snapshot.windDirDeg, 17)
    });
  }
};
