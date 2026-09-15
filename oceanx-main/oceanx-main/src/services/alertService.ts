import type { Alert, Severity } from '@/lib/types';
import { ALERTS, ALERT_BY_ID } from '@/lib/mock/alerts';
import { apiClient } from './apiClient';

export interface AlertFilter {
  severity?: Severity | 'all';
  type?: Alert['type'] | 'all';
  onlyUnacknowledged?: boolean;
  search?: string;
}

export const ALERT_TYPE_LABELS: Record<Alert['type'], string> = {
  new_spill: 'New spill',
  high_confidence_detection: 'High-confidence detection',
  rapid_spread: 'Rapidly spreading spill',
  high_vessel_correlation: 'High vessel correlation',
  environmental_risk: 'Environmental risk',
  data_source_failure: 'Data source failure',
  ai_service_failure: 'AI service failure'
};

export const alertService = {
  list(filter: AlertFilter = {}) {
    const { severity = 'all', type = 'all', onlyUnacknowledged = false, search = '' } = filter;
    const needle = search.trim().toLowerCase();

    return apiClient.get<Alert[]>('/alerts', {
      latencyMs: 280,
      mock: () =>
        ALERTS.filter((a) => {
          if (severity !== 'all' && a.severity !== severity) return false;
          if (type !== 'all' && a.type !== type) return false;
          if (onlyUnacknowledged && a.acknowledged) return false;
          if (!needle) return true;
          return a.title.toLowerCase().includes(needle) || a.message.toLowerCase().includes(needle);
        })
    });
  },

  acknowledge(id: string) {
    return apiClient.post<Alert>(`/alerts/${id}/acknowledge`, {
      latencyMs: 260,
      mock: () => ({ ...ALERT_BY_ID[id], acknowledged: true })
    });
  },

  acknowledgeAll() {
    return apiClient.post<Alert[]>('/alerts/acknowledge-all', {
      latencyMs: 420,
      mock: () => ALERTS.map((a) => ({ ...a, acknowledged: true }))
    });
  },

  unacknowledgedCount() {
    return ALERTS.filter((a) => !a.acknowledged).length;
  }
};
