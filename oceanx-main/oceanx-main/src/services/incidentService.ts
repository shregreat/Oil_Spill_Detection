import type { DashboardStats, Incident, IncidentStatus, Severity } from '@/lib/types';
import { INCIDENTS, INCIDENT_BY_ID } from '@/lib/mock/incidents';
import { LATEST_SCENE } from '@/lib/mock/satellite';
import { REGIONAL_CONDITIONS } from '@/lib/mock/environment';
import { VESSELS } from '@/lib/mock/vessels';
import { MODELS } from '@/lib/mock/system';
import { ApiError, apiClient } from './apiClient';
import { isoOffset, round } from '@/lib/utils';

export interface IncidentFilter {
  status?: IncidentStatus | 'all';
  severity?: Severity | 'all';
  search?: string;
  minConfidence?: number;
}

const ACTIVE_STATUSES: IncidentStatus[] = ['active', 'investigating', 'monitoring'];

function applyFilter(incidents: Incident[], filter: IncidentFilter = {}) {
  const { status = 'all', severity = 'all', search = '', minConfidence = 0 } = filter;
  const needle = search.trim().toLowerCase();

  return incidents.filter((incident) => {
    if (status !== 'all' && incident.status !== status) return false;
    if (severity !== 'all' && incident.severity !== severity) return false;
    if (incident.detection.confidence < minConfidence) return false;
    if (!needle) return true;
    return (
      incident.id.toLowerCase().includes(needle) ||
      incident.title.toLowerCase().includes(needle) ||
      incident.region.toLowerCase().includes(needle) ||
      incident.suspects.some((s) => s.name.toLowerCase().includes(needle) || s.mmsi.includes(needle))
    );
  });
}

export const incidentService = {
  list(filter: IncidentFilter = {}) {
    return apiClient.get<Incident[]>('/incidents', {
      latencyMs: 340,
      mock: () => applyFilter(INCIDENTS, filter)
    });
  },

  get(id: string) {
    return apiClient.get<Incident>(`/incidents/${id}`, {
      latencyMs: 380,
      failWith: INCIDENT_BY_ID[id] ? undefined : new ApiError(`Incident ${id} was not found`, 'not_found', 404),
      mock: () => INCIDENT_BY_ID[id]
    });
  },

  stats() {
    return apiClient.get<DashboardStats>('/incidents/stats', {
      latencyMs: 260,
      mock: () => {
        const active = INCIDENTS.filter((i) => ACTIVE_STATUSES.includes(i.status));
        const highConfidence = INCIDENTS.filter((i) => i.detection.confidence >= 0.85);
        const suspects = new Set(
          INCIDENTS.flatMap((i) => i.suspects.filter((s) => s.responsibilityScore >= 50).map((s) => s.mmsi))
        );
        const attribution = MODELS.find((m) => m.id === 'oceanx-attribution');

        return {
          activeIncidents: active.length,
          activeIncidentsDelta: 2,
          newDetections24h: 4,
          newDetectionsDelta: 1,
          totalSpillAreaKm2: round(
            active.reduce((sum, i) => sum + i.slick.areaKm2, 0),
            2
          ),
          spillAreaDelta: 11.4,
          highConfidenceDetections: highConfidence.length,
          highConfidenceDelta: 1,
          suspectVessels: suspects.size,
          suspectVesselsDelta: 3,
          latestSatelliteUpdate: LATEST_SCENE.acquiredAt,
          latestSatelliteScene: LATEST_SCENE.id,
          latestAisUpdate: isoOffset(-1),
          aisMessageRate: 1284,
          weatherStatus: 'operational',
          weatherSummary: REGIONAL_CONDITIONS['Arabian Sea'].weather,
          modelStatus: attribution?.status === 'degraded' ? 'degraded' : 'operational',
          modelSummary:
            attribution?.status === 'degraded'
              ? 'Attribution ranker drift 0.21 - review scheduled'
              : 'All inference services nominal',
          vesselsTracked: VESSELS.length
        };
      }
    });
  },

  updateStatus(id: string, status: IncidentStatus) {
    return apiClient.patch<Incident>(`/incidents/${id}`, {
      latencyMs: 420,
      mock: () => ({ ...INCIDENT_BY_ID[id], status, updatedAt: isoOffset(0) })
    });
  },

  addNote(id: string, note: string) {
    return apiClient.post<Incident>(`/incidents/${id}/notes`, {
      latencyMs: 380,
      mock: () => ({ ...INCIDENT_BY_ID[id], notes: `${note}\n\n${INCIDENT_BY_ID[id].notes}` })
    });
  }
};
