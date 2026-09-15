import type { AnalyticsSeries, DataSource, ModelStatus, SystemUser } from '@/lib/types';
import { DATA_SOURCES, MODELS, PIPELINE_QUEUE, SYSTEM_USERS } from '@/lib/mock/system';
import { ANALYTICS, ANALYTICS_KPIS } from '@/lib/mock/analytics';
import { apiClient } from './apiClient';

export const systemService = {
  dataSources() {
    return apiClient.get<DataSource[]>('/system/data-sources', {
      latencyMs: 300,
      mock: () => DATA_SOURCES
    });
  },

  pipelineQueue() {
    return apiClient.get<typeof PIPELINE_QUEUE>('/system/pipeline', {
      latencyMs: 240,
      mock: () => PIPELINE_QUEUE
    });
  },

  models() {
    return apiClient.get<ModelStatus[]>('/system/models', {
      latencyMs: 320,
      mock: () => MODELS
    });
  },

  users() {
    return apiClient.get<SystemUser[]>('/system/users', {
      latencyMs: 300,
      mock: () => SYSTEM_USERS
    });
  },

  updateUserRole(id: string, role: SystemUser['role']) {
    return apiClient.patch<SystemUser>(`/system/users/${id}`, {
      latencyMs: 360,
      mock: () => ({ ...SYSTEM_USERS.find((u) => u.id === id)!, role })
    });
  },

  analytics() {
    return apiClient.get<AnalyticsSeries>('/system/analytics', {
      latencyMs: 380,
      mock: () => ANALYTICS
    });
  },

  analyticsKpis() {
    return apiClient.get<typeof ANALYTICS_KPIS>('/system/analytics/kpis', {
      latencyMs: 240,
      mock: () => ANALYTICS_KPIS
    });
  }
};
