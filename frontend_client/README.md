# Oil Spill Detection — Frontend Integration Guide

This guide is for teammates building the user interface. It contains everything needed to connect the frontend to the backend API.

---

## 1. Backend Server URL
- **Local API Base:** `http://127.0.0.1:8000`
- **Interactive OpenAPI Docs:** `http://127.0.0.1:8000/docs`
- **CORS:** Pre-configured for `localhost:3000`, `localhost:5173` (Vite), and `localhost:8080`.

---

## 2. Copy the Client Library
Copy [`oilSpillApi.ts`](oilSpillApi.ts) into your frontend project's `src/api/` or `src/services/` directory.

---

## 3. Usage Examples

### A. Upload and Run Detection (React / Vite)
```tsx
import React, { useState } from "react";
import { oilSpillApi, PredictResponse } from "./api/oilSpillApi";

export function SpillUploader() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictResponse | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const data = await oilSpillApi.detect(file);
      setResult(data);
    } catch (err: any) {
      alert("Detection failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input type="file" accept=".tif,.tiff" onChange={handleUpload} />
      {loading && <p>Analyzing radar imagery with U-Net...</p>}

      {result && (
        <div>
          <h3>{result.detected ? "⚠️ Oil Spill Detected!" : "✅ Clean Water Body"}</h3>
          {result.detected && (
            <ul>
              <li>Confidence: {(result.confidence * 100).toFixed(1)}%</li>
              <li>Estimated Spill Area: {result.area_km2.toFixed(3)} km²</li>
              <li>Perimeter: {result.perimeter_m.toFixed(0)} m</li>
              <li>Centroid: {result.latitude?.toFixed(4)}°N, {result.longitude?.toFixed(4)}°W</li>
              <li>Regions: {result.num_regions}</li>
            </ul>
          )}

          {/* Instant Visual Overlay Image */}
          {result.overlay_base64 && (
            <img
              src={result.overlay_base64}
              alt="Spill Overlay Preview"
              style={{ maxWidth: "100%", borderRadius: 8 }}
            />
          )}
        </div>
      )}
    </div>
  );
}
```

---

### B. Displaying Spill Polygons on a Map (Leaflet)
The client includes `oilSpillApi.toGeoJSON(result)` which formats detection boundaries into standard GeoJSON:

```tsx
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import { oilSpillApi, PredictResponse } from "./api/oilSpillApi";

export function SpillMap({ result }: { result: PredictResponse }) {
  if (!result.detected || !result.latitude || !result.longitude) return null;

  const geoJsonData = oilSpillApi.toGeoJSON(result);

  return (
    <MapContainer
      center={[result.latitude, result.longitude]}
      zoom={11}
      style={{ height: "450px", width: "100%" }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <GeoJSON
        data={geoJsonData}
        style={{
          color: "#e11d48",
          weight: 2,
          fillColor: "#ef4444",
          fillOpacity: 0.45,
        }}
      />
    </MapContainer>
  );
}
```

---

### C. Dashboard Statistics & History
```ts
// Fetch past scans (paginated)
const scansData = await oilSpillApi.listScans(1, 20);

// Fetch dashboard KPIs
const stats = await oilSpillApi.getStats();
console.log(`Total Area: ${stats.total_spill_area_km2} km² across ${stats.spills_detected} incidents.`);
```
