/**
 * Oil Spill Detection API Client Service
 * Connects OceanX frontend directly to the PyTorch U-Net backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1';

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

export const oilSpillService = {
  /**
   * Health check for API, PyTorch model, and Database status.
   */
  async checkHealth(): Promise<HealthResponse> {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
      return await res.json();
    } catch {
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
      const res = await fetch(`${API_BASE}/samples`);
      if (!res.ok) return [];
      const data: SampleListResponse = await res.json();
      return data.samples;
    } catch {
      return [];
    }
  },

  /**
   * Run U-Net detection on a server-side sample image by filename.
   */
  async detectSample(filename: string): Promise<PredictResponse> {
    const res = await fetch(`${API_BASE}/detect/sample?filename=${encodeURIComponent(filename)}`, {
      method: 'POST'
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.detail || `Detection failed: ${res.status}`);
    }

    return await res.json();
  },

  /**
   * Upload a SAR GeoTIFF (.tif or .tiff) image for oil spill detection.
   */
  async detectFile(file: File): Promise<PredictResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/detect`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.detail || `Upload & detection failed: ${res.status}`);
    }

    return await res.json();
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
  }
};
