import type { ProcessingStage, SatelliteScene } from '@/lib/types';
import { LATEST_SCENE, SATELLITE_SCENES, SCENE_BY_ID, SCENE_COVERAGE_SUMMARY, UPCOMING_PASSES } from '@/lib/mock/satellite';
import { ApiError, apiClient } from './apiClient';

export interface SceneFilter {
  mission?: string | 'all';
  stage?: ProcessingStage | 'all';
  search?: string;
}

export const PROCESSING_SEQUENCE: ProcessingStage[] = ['queued', 'processing', 'detection', 'complete'];

export const satelliteService = {
  listScenes(filter: SceneFilter = {}) {
    const { mission = 'all', stage = 'all', search = '' } = filter;
    const needle = search.trim().toLowerCase();
    return apiClient.get<SatelliteScene[]>('/satellite/scenes', {
      latencyMs: 300,
      mock: () =>
        SATELLITE_SCENES.filter((scene) => {
          if (mission !== 'all' && scene.mission !== mission) return false;
          if (stage !== 'all' && scene.processingStage !== stage) return false;
          if (!needle) return true;
          return scene.id.toLowerCase().includes(needle) || scene.region.toLowerCase().includes(needle);
        })
    });
  },

  getScene(id: string) {
    return apiClient.get<SatelliteScene>(`/satellite/scenes/${id}`, {
      latencyMs: 260,
      failWith: SCENE_BY_ID[id] ? undefined : new ApiError(`Scene ${id} was not found`, 'not_found', 404),
      mock: () => SCENE_BY_ID[id]
    });
  },

  latest() {
    return apiClient.get<SatelliteScene>('/satellite/scenes/latest', {
      latencyMs: 200,
      mock: () => LATEST_SCENE
    });
  },

  coverage() {
    return apiClient.get<typeof SCENE_COVERAGE_SUMMARY>('/satellite/coverage', {
      latencyMs: 220,
      mock: () => SCENE_COVERAGE_SUMMARY
    });
  },

  upcomingPasses() {
    return apiClient.get<typeof UPCOMING_PASSES>('/satellite/passes', {
      latencyMs: 240,
      mock: () => UPCOMING_PASSES
    });
  },

  missions() {
    return Array.from(new Set(SATELLITE_SCENES.map((s) => s.mission)));
  },

  /** Kicks off a (simulated) detection run for a scene. */
  requestDetection(sceneId: string) {
    return apiClient.post<{ jobId: string; sceneId: string; stage: ProcessingStage }>(
      `/satellite/scenes/${sceneId}/detect`,
      {
        latencyMs: 300,
        mock: () => ({ jobId: `JOB-${sceneId.slice(-6)}`, sceneId, stage: 'queued' })
      }
    );
  }
};
