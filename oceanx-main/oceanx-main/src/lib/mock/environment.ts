import type { EnvironmentSnapshot, HeatPoint, LatLng, VectorSample } from '../types';
import { isoOffset, round, seededRandom } from '../utils';

/** Builds a smooth, deterministic vector field over a bounding area. */
export function buildVectorField(
  center: LatLng,
  baseSpeed: number,
  baseDirection: number,
  seed: number,
  spanDeg = 0.9,
  gridSize = 6
): VectorSample[] {
  const rnd = seededRandom(seed);
  const samples: VectorSample[] = [];
  const step = (spanDeg * 2) / (gridSize - 1);

  for (let row = 0; row < gridSize; row += 1) {
    for (let col = 0; col < gridSize; col += 1) {
      const lat = center[0] - spanDeg + row * step;
      const lng = center[1] - spanDeg + col * step;
      samples.push({
        position: [round(lat, 4), round(lng, 4)],
        speed: round(Math.max(0.2, baseSpeed * (0.7 + rnd() * 0.6)), 2),
        directionDeg: round((baseDirection + (rnd() - 0.5) * 40 + 360) % 360, 0)
      });
    }
  }
  return samples;
}

export function buildHeatPoints(centers: LatLng[], seed = 91): HeatPoint[] {
  const rnd = seededRandom(seed);
  const points: HeatPoint[] = [];
  centers.forEach((center, idx) => {
    const count = 9 + (idx % 3) * 3;
    for (let i = 0; i < count; i += 1) {
      points.push({
        position: [round(center[0] + (rnd() - 0.5) * 0.9, 4), round(center[1] + (rnd() - 0.5) * 0.9, 4)],
        intensity: round(0.25 + rnd() * 0.75, 2)
      });
    }
  });
  return points;
}

/** 48 hours of hourly met-ocean history for charts. */
export const MET_OCEAN_HISTORY = Array.from({ length: 48 }, (_, i) => {
  const rnd = seededRandom(400 + i);
  const phase = Math.sin((i / 48) * Math.PI * 2);
  return {
    hour: isoOffset(-60 * (47 - i)),
    windMs: round(6.4 + phase * 2.6 + rnd() * 0.9, 2),
    currentMs: round(0.42 + phase * 0.16 + rnd() * 0.07, 3),
    waveM: round(1.5 + phase * 0.55 + rnd() * 0.2, 2),
    sstC: round(28.1 + phase * 0.5 + rnd() * 0.2, 2)
  };
});

export const REGIONAL_CONDITIONS: Record<string, EnvironmentSnapshot> = {
  'Arabian Sea': {
    observedAt: isoOffset(-18),
    windSpeedMs: 7.8,
    windDirDeg: 228,
    windGustMs: 11.4,
    currentSpeedMs: 0.54,
    currentDirDeg: 118,
    waveHeightM: 1.9,
    wavePeriodS: 7.4,
    seaSurfaceTempC: 28.4,
    airTempC: 29.1,
    visibilityKm: 12,
    weather: 'Partly cloudy, moderate SW swell',
    salinityPsu: 36.2
  },
  'Gulf of Kutch': {
    observedAt: isoOffset(-22),
    windSpeedMs: 6.2,
    windDirDeg: 254,
    windGustMs: 9.1,
    currentSpeedMs: 0.71,
    currentDirDeg: 96,
    waveHeightM: 1.4,
    wavePeriodS: 6.1,
    seaSurfaceTempC: 27.6,
    airTempC: 30.4,
    visibilityKm: 9,
    weather: 'Hazy, strong tidal streams',
    salinityPsu: 37.1
  },
  'Bay of Bengal': {
    observedAt: isoOffset(-31),
    windSpeedMs: 9.4,
    windDirDeg: 196,
    windGustMs: 13.8,
    currentSpeedMs: 0.48,
    currentDirDeg: 42,
    waveHeightM: 2.4,
    wavePeriodS: 8.2,
    seaSurfaceTempC: 29.2,
    airTempC: 30.0,
    visibilityKm: 7,
    weather: 'Overcast with squall lines',
    salinityPsu: 33.4
  },
  'Laccadive Sea': {
    observedAt: isoOffset(-26),
    windSpeedMs: 5.1,
    windDirDeg: 271,
    windGustMs: 7.6,
    currentSpeedMs: 0.33,
    currentDirDeg: 152,
    waveHeightM: 1.1,
    wavePeriodS: 6.8,
    seaSurfaceTempC: 29.6,
    airTempC: 30.2,
    visibilityKm: 15,
    weather: 'Clear, light westerly breeze',
    salinityPsu: 34.8
  }
};
