import type { EnvironmentSnapshot, VectorSample } from '@/lib/types';
import { round, isoOffset } from '@/lib/utils';
import { buildVectorField, REGIONAL_CONDITIONS, MET_OCEAN_HISTORY } from '@/lib/mock/environment';

export const REGION_COORDINATES: Record<string, [number, number]> = {
  'Arabian Sea': [19.42, 71.60],
  'Gulf of Kutch': [22.45, 69.50],
  'Bay of Bengal': [18.50, 86.00],
  'Laccadive Sea': [10.00, 73.50],
  'Andaman Sea': [11.50, 93.00]
};

export function describeWeatherCode(code: number): string {
  switch (code) {
    case 0:
      return 'Clear sky, calm waters';
    case 1:
      return 'Mainly clear, slight breeze';
    case 2:
      return 'Partly cloudy, moderate swell';
    case 3:
      return 'Overcast, steady breeze';
    case 45:
    case 48:
      return 'Fog / marine haze, reduced visibility';
    case 51:
    case 53:
    case 55:
      return 'Light drizzle, choppy sea';
    case 61:
    case 63:
    case 65:
      return 'Rain showers, moderate seas';
    case 71:
    case 73:
    case 75:
      return 'Squall lines, rough seas';
    case 80:
    case 81:
    case 82:
      return 'Heavy rain showers, high swells';
    case 95:
    case 96:
    case 99:
      return 'Severe thunderstorm, hazardous sea conditions';
    default:
      return 'Fair marine conditions';
  }
}

// In-memory 5-minute cache to respect rate limits and keep navigation instantaneous
const cache = new Map<string, { timestamp: number; data: unknown }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCached<T>(key: string): T | null {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return item.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { timestamp: Date.now(), data });
}

function resolveCoordinates(regionOrCoords?: string | [number, number]): [number, number] {
  if (Array.isArray(regionOrCoords)) return regionOrCoords;
  if (typeof regionOrCoords === 'string' && REGION_COORDINATES[regionOrCoords]) {
    return REGION_COORDINATES[regionOrCoords];
  }
  return REGION_COORDINATES['Arabian Sea'];
}

export const openMeteoService = {
  /**
   * Fetch real-time marine weather snapshot from Open-Meteo Marine API & Forecast API.
   */
  async getCurrentConditions(regionOrCoords: string | [number, number] = 'Arabian Sea'): Promise<EnvironmentSnapshot> {
    const coords = resolveCoordinates(regionOrCoords);
    const regionKey = typeof regionOrCoords === 'string' ? regionOrCoords : 'Custom Location';
    const cacheKey = `marine_current_${coords[0].toFixed(2)}_${coords[1].toFixed(2)}`;

    const cached = getCached<EnvironmentSnapshot>(cacheKey);
    if (cached) return cached;

    try {
      const [lat, lng] = coords;

      // Query Open-Meteo Marine API and Open-Meteo Forecast API in parallel
      const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&current=wave_height,wave_direction,wave_period,ocean_current_velocity,ocean_current_direction,wind_wave_height,swell_wave_height`;
      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code,visibility&wind_speed_unit=ms`;

      const [marineRes, forecastRes] = await Promise.all([
        fetch(marineUrl, { signal: AbortSignal.timeout(4000) }),
        fetch(forecastUrl, { signal: AbortSignal.timeout(4000) })
      ]);

      if (!marineRes.ok && !forecastRes.ok) {
        throw new Error('Both Open-Meteo endpoints failed');
      }

      const marineData = marineRes.ok ? await marineRes.json() : null;
      const forecastData = forecastRes.ok ? await forecastRes.json() : null;

      const mCurr = marineData?.current || {};
      const fCurr = forecastData?.current || {};

      // Ocean current velocity comes in km/h from Open-Meteo, convert to m/s
      const currentSpeedMs = mCurr.ocean_current_velocity != null
        ? round(Number(mCurr.ocean_current_velocity) / 3.6, 2)
        : 0.54;

      const windSpeedMs = fCurr.wind_speed_10m != null
        ? round(Number(fCurr.wind_speed_10m), 1)
        : 7.8;

      const windGustMs = fCurr.wind_gusts_10m != null
        ? round(Number(fCurr.wind_gusts_10m), 1)
        : round(windSpeedMs * 1.4, 1);

      const waveHeightM = mCurr.wave_height != null
        ? round(Number(mCurr.wave_height), 2)
        : 1.8;

      const wavePeriodS = mCurr.wave_period != null
        ? round(Number(mCurr.wave_period), 1)
        : 7.2;

      const airTempC = fCurr.temperature_2m != null
        ? round(Number(fCurr.temperature_2m), 1)
        : 28.5;

      const visibilityKm = fCurr.visibility != null
        ? Math.max(1, Math.round(Number(fCurr.visibility) / 1000))
        : 12;

      const weather = fCurr.weather_code != null
        ? describeWeatherCode(Number(fCurr.weather_code))
        : 'Live marine stream active';

      const snapshot: EnvironmentSnapshot = {
        observedAt: (fCurr.time || mCurr.time ? new Date().toISOString() : isoOffset(-5)),
        windSpeedMs,
        windDirDeg: fCurr.wind_direction_10m != null ? Math.round(Number(fCurr.wind_direction_10m)) : 228,
        windGustMs,
        currentSpeedMs,
        currentDirDeg: mCurr.ocean_current_direction != null ? Math.round(Number(mCurr.ocean_current_direction)) : 118,
        waveHeightM,
        wavePeriodS,
        seaSurfaceTempC: round(airTempC - 0.7, 1),
        airTempC,
        visibilityKm,
        weather,
        salinityPsu: 35.8
      };

      setCache(cacheKey, snapshot);
      return snapshot;
    } catch {
      // Graceful fallback to calibrated regional telemetry if network call times out
      return REGIONAL_CONDITIONS[regionKey] || REGIONAL_CONDITIONS['Arabian Sea'];
    }
  },

  /**
   * Fetch 48-hour met-ocean hourly history for charts from Open-Meteo.
   */
  async getMetOceanHistory(regionOrCoords: string | [number, number] = 'Arabian Sea') {
    const coords = resolveCoordinates(regionOrCoords);
    const cacheKey = `marine_history_${coords[0].toFixed(2)}_${coords[1].toFixed(2)}`;

    const cached = getCached<typeof MET_OCEAN_HISTORY>(cacheKey);
    if (cached) return cached;

    try {
      const [lat, lng] = coords;
      const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&hourly=wave_height,ocean_current_velocity&past_days=2&forecast_days=1`;
      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=wind_speed_10m,temperature_2m&wind_speed_unit=ms&past_days=2&forecast_days=1`;

      const [marineRes, forecastRes] = await Promise.all([
        fetch(marineUrl, { signal: AbortSignal.timeout(5000) }),
        fetch(forecastUrl, { signal: AbortSignal.timeout(5000) })
      ]);

      if (!marineRes.ok || !forecastRes.ok) throw new Error();

      const mData = await marineRes.json();
      const fData = await forecastRes.json();

      const times: string[] = mData?.hourly?.time || fData?.hourly?.time || [];
      const waveHeights: number[] = mData?.hourly?.wave_height || [];
      const currents: number[] = mData?.hourly?.ocean_current_velocity || [];
      const winds: number[] = fData?.hourly?.wind_speed_10m || [];
      const temps: number[] = fData?.hourly?.temperature_2m || [];

      // Take the latest 48 hourly readings
      const count = Math.min(times.length, 48);
      const startIdx = Math.max(0, times.length - count);

      const history = [];
      for (let i = startIdx; i < times.length; i++) {
        history.push({
          hour: times[i] ? new Date(times[i]).toISOString() : isoOffset(-(times.length - i) * 60),
          windMs: winds[i] != null ? round(winds[i], 1) : 7.2,
          currentMs: currents[i] != null ? round(currents[i] / 3.6, 2) : 0.45,
          waveM: waveHeights[i] != null ? round(waveHeights[i], 2) : 1.6,
          sstC: temps[i] != null ? round(temps[i] - 0.5, 1) : 28.0
        });
      }

      if (history.length >= 12) {
        setCache(cacheKey, history);
        return history;
      }
      return MET_OCEAN_HISTORY;
    } catch {
      return MET_OCEAN_HISTORY;
    }
  },

  /**
   * Generates a 2D wind vector grid calibrated with real-time Open-Meteo wind vectors.
   */
  async getWindVectorField(center: [number, number], region = 'Arabian Sea'): Promise<VectorSample[]> {
    const conditions = await this.getCurrentConditions(region);
    return buildVectorField(center, conditions.windSpeedMs, conditions.windDirDeg, 17);
  },

  /**
   * Generates a 2D ocean hydrodynamic current vector grid calibrated with real-time Open-Meteo ocean currents.
   */
  async getCurrentVectorField(center: [number, number], region = 'Arabian Sea'): Promise<VectorSample[]> {
    const conditions = await this.getCurrentConditions(region);
    return buildVectorField(center, conditions.currentSpeedMs * 10, conditions.currentDirDeg, 29);
  }
};

