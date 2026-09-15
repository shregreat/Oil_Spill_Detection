import type { Vessel, VesselTrack, VesselType } from '@/lib/types';
import { VESSELS, VESSEL_BY_MMSI, VESSEL_TRACKS } from '@/lib/mock/vessels';
import { ApiError, apiClient } from './apiClient';

export interface VesselFilter {
  search?: string;
  types?: VesselType[];
  minSpeedKn?: number;
  maxSpeedKn?: number;
  flag?: string | 'all';
  onlyMoving?: boolean;
}

export const VESSEL_TYPES: VesselType[] = [
  'Crude Oil Tanker',
  'Product Tanker',
  'Chemical Tanker',
  'LNG Carrier',
  'Bulk Carrier',
  'Container Ship',
  'Cargo',
  'Offshore Supply',
  'Fishing Vessel',
  'Tug'
];

export const aisService = {
  listVessels(filter: VesselFilter = {}) {
    const { search = '', types = [], minSpeedKn = 0, maxSpeedKn = 40, flag = 'all', onlyMoving = false } = filter;
    const needle = search.trim().toLowerCase();

    return apiClient.get<Vessel[]>('/ais/vessels', {
      latencyMs: 300,
      mock: () =>
        VESSELS.filter((v) => {
          if (types.length && !types.includes(v.type)) return false;
          if (v.speedKn < minSpeedKn || v.speedKn > maxSpeedKn) return false;
          if (flag !== 'all' && v.flag !== flag) return false;
          if (onlyMoving && v.speedKn < 0.5) return false;
          if (!needle) return true;
          return (
            v.name.toLowerCase().includes(needle) ||
            v.mmsi.includes(needle) ||
            v.imo.includes(needle) ||
            v.callSign.toLowerCase().includes(needle) ||
            v.operator.toLowerCase().includes(needle)
          );
        })
    });
  },

  getVessel(mmsi: string) {
    return apiClient.get<Vessel>(`/ais/vessels/${mmsi}`, {
      latencyMs: 240,
      failWith: VESSEL_BY_MMSI[mmsi] ? undefined : new ApiError(`Vessel ${mmsi} was not found`, 'not_found', 404),
      mock: () => VESSEL_BY_MMSI[mmsi]
    });
  },

  getTrack(mmsi: string) {
    return apiClient.get<VesselTrack>(`/ais/vessels/${mmsi}/track`, {
      latencyMs: 280,
      failWith: VESSEL_TRACKS[mmsi] ? undefined : new ApiError(`No AIS track for ${mmsi}`, 'not_found', 404),
      mock: () => VESSEL_TRACKS[mmsi]
    });
  },

  getTracks(mmsis: string[]) {
    return apiClient.get<VesselTrack[]>('/ais/tracks', {
      latencyMs: 320,
      mock: () => mmsis.map((m) => VESSEL_TRACKS[m]).filter(Boolean)
    });
  },

  flags() {
    return Array.from(new Set(VESSELS.map((v) => v.flag))).sort();
  },

  feedSummary() {
    return apiClient.get<{ messageRate: number; vesselsTracked: number; coverageNm: number; gapsDetected: number }>(
      '/ais/summary',
      {
        latencyMs: 200,
        mock: () => ({ messageRate: 1284, vesselsTracked: VESSELS.length, coverageNm: 200, gapsDetected: 3 })
      }
    );
  }
};
