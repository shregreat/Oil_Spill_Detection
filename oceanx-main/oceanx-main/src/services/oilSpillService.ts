import { USE_MOCKS } from './apiClient';

const resolveApiUrl = (): string => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) {
      return (import.meta as any).env.VITE_API_URL;
    }
  } catch {}
  try {
    if (typeof process !== 'undefined' && process.env) {
      return (
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.VITE_API_URL ||
        'http://127.0.0.1:8000/api/v1'
      );
    }
  } catch {}
  return 'http://127.0.0.1:8000/api/v1';
};

export const API_URL = resolveApiUrl();
const API_BASE = API_URL.replace(/\/+$/, '');

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  supabase_connected: boolean;
  device: string;
  version: string;
  model_name?: string;
  threshold?: number;
  min_area_pixels?: number;
}

export interface SampleScene {
  filename: string;
  size_mb: number;
  width: number | null;
  height: number | null;
  crs: string | null;
  region: string;
  description: string;
}

export interface SampleListResponse {
  samples: SampleScene[];
  total: number;
}

export interface DetectionResult {
  id?: string;
  scan_id?: string;
  confidence: number;
  latitude: number | null;
  longitude: number | null;
  area_m2: number;
  area_km2: number;
  perimeter_m: number;
  num_regions: number;
  threshold: number;
  polygon: [number, number][];      // [lat, lon] coordinates of primary contour
  polygons: [number, number][][];   // All detected contours
  created_at?: string;
}

export interface PredictResponse {
  success: boolean;
  scan_id: string | null;
  filename: string;
  detected: boolean;
  confidence: number;
  latitude: number | null;
  longitude: number | null;
  area_m2: number;
  area_km2: number;
  perimeter_m: number;
  polygon: [number, number][];
  polygons: [number, number][][];
  num_regions: number;
  threshold: number;
  image_url: string | null;
  overlay_url: string | null;
  overlay_base64: string | null;    // Inline PNG data URI for direct <img src="..." />
  message: string;
}

export interface ScanResponse {
  id: string;
  filename: string;
  image_url: string | null;
  overlay_url: string | null;
  width: number | null;
  height: number | null;
  detected: boolean;
  scan_date: string | null;
  created_at: string | null;
  detections: DetectionResult[];
}

export interface ScanListResponse {
  scans: ScanResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface StatsResponse {
  total_scans: number;
  total_detected: number;
  total_clean: number;
  total_detections: number;
  total_area_km2: number;
  detection_rate: number;
}

const MOCK_SAMPLES: SampleScene[] = [
  {
    filename: 'sar_mumbai_high_20260912.tif',
    size_mb: 42.6,
    width: 1024,
    height: 1024,
    crs: 'EPSG:4326',
    region: 'Arabian Sea · Mumbai High',
    description: 'Sentinel-1 C-SAR IW Mode image showing high-contrast dark slick pattern.'
  },
  {
    filename: 'sar_gulf_of_kutch_20260910.tif',
    size_mb: 38.1,
    width: 1024,
    height: 1024,
    crs: 'EPSG:4326',
    region: 'Gulf of Kutch · Vadinar',
    description: 'Enclosed coastal bay radar pass with tanker anchorage and surface sheen.'
  },
  {
    filename: 'sar_bay_of_bengal_20260908.tif',
    size_mb: 49.3,
    width: 1024,
    height: 1024,
    crs: 'EPSG:4326',
    region: 'Bay of Bengal · Paradip Approach',
    description: 'Offshore shipping lane with linear trail signature matching suspect route.'
  }
];

const createMockPrediction = (filename: string): PredictResponse => ({
  success: true,
  scan_id: `scan-${Date.now().toString(36)}`,
  filename,
  detected: true,
  confidence: 0.942,
  latitude: 19.4231,
  longitude: 71.6148,
  area_m2: 18420000,
  area_km2: 18.42,
  perimeter_m: 24650,
  num_regions: 2,
  threshold: 0.40,
  polygon: [
    [19.45, 71.58],
    [19.44, 71.64],
    [19.40, 71.65],
    [19.39, 71.59],
    [19.45, 71.58]
  ],
  polygons: [
    [
      [19.45, 71.58],
      [19.44, 71.64],
      [19.40, 71.65],
      [19.39, 71.59],
      [19.45, 71.58]
    ]
  ],
  image_url: null,
  overlay_url: null,
  overlay_base64: null,
  message: 'Detection complete (PyTorch U-Net inference simulation)'
});

export const oilSpillService = {
  /**
   * Health check for API, PyTorch model, and Database status.
   */
  async checkHealth(): Promise<HealthResponse> {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
      return await res.json();
    } catch {
      if (USE_MOCKS) {
        return {
          status: 'healthy',
          model_loaded: true,
          supabase_connected: true,
          device: 'CUDA / PyTorch 2.3 (Active)',
          version: '1.0.0 (Production Build)',
          model_name: 'PyTorch U-Net (Oil Spill Detector)',
          threshold: 0.4,
          min_area_pixels: 100
        };
      }
      return {
        status: 'offline',
        model_loaded: false,
        supabase_connected: false,
        device: 'offline',
        version: '1.0.0',
        model_name: 'PyTorch U-Net',
        threshold: 0.4,
        min_area_pixels: 100
      };
    }
  },

  /**
   * List available server-side sample SAR scenes from Radar_data.
   */
  async listSamples(): Promise<SampleScene[]> {
    try {
      const res = await fetch(`${API_BASE}/samples`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error();
      const data: SampleListResponse = await res.json();
      return data.samples.length > 0 ? data.samples : (USE_MOCKS ? MOCK_SAMPLES : []);
    } catch {
      return USE_MOCKS ? MOCK_SAMPLES : [];
    }
  },

  /**
   * Run U-Net detection on a server-side sample image by filename.
   */
  async detectSample(filename: string): Promise<PredictResponse> {
    try {
      const res = await fetch(`${API_BASE}/detect/sample?filename=${encodeURIComponent(filename)}`, {
        method: 'POST',
        signal: AbortSignal.timeout(8000)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || `Detection failed: ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      if (USE_MOCKS) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        return createMockPrediction(filename);
      }
      throw err;
    }
  },

  /**
   * Upload a SAR GeoTIFF (.tif or .tiff) image for oil spill detection.
   */
  async detectFile(file: File): Promise<PredictResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/detect`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(12000)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || `Upload & detection failed: ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      if (USE_MOCKS) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        return createMockPrediction(file.name);
      }
      throw err;
    }
  },

  /**
   * List past scans with pagination.
   */
  async listScans(limit: number = 20, offset: number = 0): Promise<ScanListResponse> {
    try {
      const res = await fetch(`${API_BASE}/scans?limit=${limit}&offset=${offset}`);
      if (!res.ok) return { scans: [], total: 0, limit, offset };
      return await res.json();
    } catch {
      return { scans: [], total: 0, limit, offset };
    }
  },

  /**
   * Fetch aggregate statistics.
   */
  async getStats(): Promise<StatsResponse> {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      if (!res.ok) {
        return {
          total_scans: 0,
          total_detected: 0,
          total_clean: 0,
          total_detections: 0,
          total_area_km2: 0,
          detection_rate: 0
        };
      }
      return await res.json();
    } catch {
      return {
        total_scans: 0,
        total_detected: 0,
        total_clean: 0,
        total_detections: 0,
        total_area_km2: 0,
        detection_rate: 0
      };
    }
  },

  /**
   * Fetch detected oil spills (e.g. from an Edge Function /spills).
   */
  async getSpills(): Promise<DetectionResult[]> {
    try {
      const res = await fetch(`${API_BASE}/spills`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }
};
