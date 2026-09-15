/**
 * Oil Spill Detection API Client (TypeScript)
 * Ready-to-use API client for frontend integration (React, Next.js, Vue, Vite, etc.)
 */

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
  polygon: [number, number][];      // Coordinates of primary spill: [lon, lat][]
  polygons: [number, number][][];   // All detected individual spill contours
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
  overlay_base64: string | null;    // Directly usable in <img src={res.overlay_base64} />
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
  spills_detected: number;
  clean_scans: number;
  detection_rate: number;
  total_spill_area_km2: number;
  avg_confidence: number;
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  supabase_connected: boolean;
  device: string;
  version: string;
}

// Resolve API URL dynamically supporting Vite (import.meta.env.VITE_API_URL) & Next.js (process.env.NEXT_PUBLIC_API_URL)
const resolveApiUrl = (): string => {
  try {
    if (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) {
      return (import.meta as any).env.VITE_API_URL;
    }
  } catch {}
  try {
    if (typeof process !== "undefined" && process.env) {
      return (
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.VITE_API_URL ||
        process.env.REACT_APP_API_URL ||
        "http://127.0.0.1:8000"
      );
    }
  } catch {}
  return "http://127.0.0.1:8000";
};

export const API_URL = resolveApiUrl();

export class OilSpillApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    const url = baseUrl || API_URL || "http://127.0.0.1:8000";
    // Remove trailing slash if provided
    this.baseUrl = url.replace(/\/+$/, "");
  }

  /**
   * Health check for API, PyTorch model, and Supabase status.
   */
  async checkHealth(): Promise<HealthResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/health`);
    if (!res.ok) {
      throw new Error(`Health check failed with status: ${res.status}`);
    }
    return res.json();
  }

  /**
   * Upload a SAR GeoTIFF (.tif or .tiff) image for oil spill detection.
   *
   * @param file File object from an <input type="file">
   */
  async detect(file: File): Promise<PredictResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${this.baseUrl}/api/v1/detect`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(
        errorData?.detail || `Detection failed with status: ${res.status}`
      );
    }

    return res.json();
  }

  /**
   * List past scans with pagination.
   */
  async listScans(page: number = 1, pageSize: number = 20): Promise<ScanListResponse> {
    const res = await fetch(
      `${this.baseUrl}/api/v1/scans?page=${page}&page_size=${pageSize}`
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(
        errorData?.detail || `Failed to fetch scans: ${res.status}`
      );
    }

    return res.json();
  }

  /**
   * Fetch full scan record and its detection polygons by ID.
   */
  async getScan(id: string): Promise<ScanResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/scans/${id}`);

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(
        errorData?.detail || `Failed to fetch scan: ${res.status}`
      );
    }

    return res.json();
  }

  /**
   * Delete a scan and cascade-delete its detections.
   */
  async deleteScan(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${this.baseUrl}/api/v1/scans/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(
        errorData?.detail || `Failed to delete scan: ${res.status}`
      );
    }

    return res.json();
  }

  /**
   * Get aggregate statistics for the dashboard.
   */
  async getStats(): Promise<StatsResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/stats`);

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(
        errorData?.detail || `Failed to fetch stats: ${res.status}`
      );
    }

    return res.json();
  }

  /**
   * Fetch detected oil spills (e.g. from Supabase Edge Function or backend /spills endpoint).
   */
  async getSpills(): Promise<DetectionResult[]> {
    const res = await fetch(`${this.baseUrl}/spills`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(
        errorData?.detail || `Failed to fetch spills: ${res.status}`
      );
    }
    return res.json();
  }

  /**
   * Helper utility to convert detection polygons to a standard GeoJSON FeatureCollection
   * for easy rendering on Leaflet / Mapbox / OpenLayers.
   */
  toGeoJSON(result: PredictResponse | DetectionResult): GeoJSON.FeatureCollection {
    const features: GeoJSON.Feature[] = [];

    const polygons =
      "polygons" in result && result.polygons.length > 0
        ? result.polygons
        : result.polygon.length > 0
        ? [result.polygon]
        : [];

    polygons.forEach((ring, idx) => {
      if (ring.length < 3) return;

      // Close polygon loop if not already closed
      const coordinates = [...ring];
      const first = coordinates[0];
      const last = coordinates[coordinates.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        coordinates.push(first);
      }

      features.push({
        type: "Feature",
        id: idx,
        properties: {
          confidence: result.confidence,
          area_km2: result.area_km2,
          perimeter_m: result.perimeter_m,
        },
        geometry: {
          type: "Polygon",
          coordinates: [coordinates],
        },
      });
    });

    return {
      type: "FeatureCollection",
      features,
    };
  }
}

// Default export singleton instance
export const oilSpillApi = new OilSpillApiClient();
