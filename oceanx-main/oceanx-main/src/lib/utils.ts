import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { LatLng, Ring, Severity } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Deterministic PRNG (mulberry32). All demo data is generated from fixed seeds
 * so the interface never changes between refreshes.
 */
export function seededRandom(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function round(value: number, decimals = 2) {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/** Fixed demo clock - keeps every timestamp stable across reloads. */
export const DEMO_NOW = new Date('2026-09-12T09:40:00Z');

export function isoOffset(minutes: number, from: Date = DEMO_NOW) {
  return new Date(from.getTime() + minutes * 60_000).toISOString();
}

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}Z`;
}

export function formatTime(iso: string) {
  return `${new Date(iso).toISOString().slice(11, 16)}Z`;
}

export function relativeTime(iso: string, now: Date = DEMO_NOW) {
  const diffMin = Math.round((now.getTime() - new Date(iso).getTime()) / 60_000);
  const abs = Math.abs(diffMin);
  const suffix = diffMin >= 0 ? 'ago' : 'from now';
  if (abs < 1) return 'just now';
  if (abs < 60) return `${abs}m ${suffix}`;
  if (abs < 1440) return `${Math.round(abs / 60)}h ${suffix}`;
  return `${Math.round(abs / 1440)}d ${suffix}`;
}

export function formatLatLng([lat, lng]: LatLng) {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}\u00b0 ${ns}, ${Math.abs(lng).toFixed(4)}\u00b0 ${ew}`;
}

export function compass(deg: number) {
  const points = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return points[Math.round(((deg % 360) / 22.5)) % 16];
}

export function severityColor(severity: Severity) {
  switch (severity) {
    case 'critical':
      return '#f43f5e';
    case 'high':
      return '#f97316';
    case 'medium':
      return '#f59e0b';
    case 'low':
      return '#38bdf8';
    default:
      return '#64748b';
  }
}

export function confidenceTier(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
}

/** Rough great-circle distance in km. */
export function distanceKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Move a point by distance (km) along a bearing (deg). */
export function project([lat, lng]: LatLng, bearingDeg: number, km: number): LatLng {
  const rad = (bearingDeg * Math.PI) / 180;
  const dLat = (km * Math.cos(rad)) / 110.574;
  const dLng = (km * Math.sin(rad)) / (111.32 * Math.cos((lat * Math.PI) / 180));
  return [round(lat + dLat, 5), round(lng + dLng, 5)];
}

/**
 * Build an organic, closed polygon around a centre. Deterministic for a seed,
 * which lets slick outlines look natural without random churn.
 */
export function blobRing(center: LatLng, radiusKm: number, seed: number, points = 26, elongation = 1.8, rotationDeg = 30): Ring {
  const rnd = seededRandom(seed);
  const ring: Ring = [];
  for (let i = 0; i < points; i += 1) {
    const theta = (i / points) * Math.PI * 2;
    const wobble = 0.78 + rnd() * 0.42;
    const r = radiusKm * wobble;
    const x = r * Math.cos(theta) * elongation;
    const y = r * Math.sin(theta);
    const rot = (rotationDeg * Math.PI) / 180;
    const xr = x * Math.cos(rot) - y * Math.sin(rot);
    const yr = x * Math.sin(rot) + y * Math.cos(rot);
    ring.push([round(center[0] + yr / 110.574, 5), round(center[1] + xr / (111.32 * Math.cos((center[0] * Math.PI) / 180)), 5)]);
  }
  ring.push(ring[0]);
  return ring;
}

export function circleRing(center: LatLng, radiusKm: number, points = 48): Ring {
  const ring: Ring = [];
  for (let i = 0; i <= points; i += 1) {
    ring.push(project(center, (i / points) * 360, radiusKm));
  }
  return ring;
}

export function bboxOf(ring: Ring) {
  const lats = ring.map((p) => p[0]);
  const lngs = ring.map((p) => p[1]);
  return {
    north: round(Math.max(...lats), 5),
    south: round(Math.min(...lats), 5),
    east: round(Math.max(...lngs), 5),
    west: round(Math.min(...lngs), 5)
  };
}

export function centroidOf(ring: Ring): LatLng {
  const lat = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const lng = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  return [round(lat, 5), round(lng, 5)];
}

export function compactNumber(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${round(value / 1_000_000, 1)}M`;
  if (Math.abs(value) >= 1_000) return `${round(value / 1_000, 1)}k`;
  return `${round(value, 2)}`;
}

export function pct(value: number, decimals = 0) {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
