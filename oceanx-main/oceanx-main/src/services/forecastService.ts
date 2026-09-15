import type { ForecastStep } from '@/lib/types';
import { INCIDENT_BY_ID, INCIDENTS } from '@/lib/mock/incidents';
import { ApiError, apiClient } from './apiClient';

export const forecastService = {
  getForecast(incidentId: string) {
    return apiClient.get<ForecastStep[]>(`/forecast/${incidentId}`, {
      latencyMs: 360,
      failWith: INCIDENT_BY_ID[incidentId]
        ? undefined
        : new ApiError(`No forecast for ${incidentId}`, 'not_found', 404),
      mock: () => INCIDENT_BY_ID[incidentId].forecast
    });
  },

  getHindcast(incidentId: string) {
    return apiClient.get<{ path: [number, number][]; origin: [number, number]; confidence: number }>(
      `/forecast/${incidentId}/hindcast`,
      {
        latencyMs: 320,
        mock: () => ({
          path: INCIDENT_BY_ID[incidentId].origin.hindcast,
          origin: INCIDENT_BY_ID[incidentId].origin.position,
          confidence: INCIDENT_BY_ID[incidentId].origin.confidence
        })
      }
    );
  },

  /** Re-runs the drift ensemble - simulated so the processing UI can be exercised. */
  recompute(incidentId: string) {
    return apiClient.post<{ jobId: string; incidentId: string }>(`/forecast/${incidentId}/recompute`, {
      latencyMs: 420,
      mock: () => ({ jobId: `DRIFT-${incidentId.slice(-4)}`, incidentId })
    });
  },

  forecastableIncidents() {
    return INCIDENTS.filter((i) => i.status !== 'false_positive');
  }
};
