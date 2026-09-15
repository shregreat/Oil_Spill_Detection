import L from 'leaflet';
import type { Vessel } from '@/lib/types';

const VESSEL_SHAPE =
  '<path d="M12 2 L17 9 L17 20 L12 22 L7 20 L7 9 Z" fill="{fill}" stroke="{stroke}" stroke-width="1.4" />';

/** Rotated vessel glyph oriented to the AIS heading. */
export function vesselIcon(vessel: Vessel, opts: { suspect?: boolean; selected?: boolean } = {}) {
  const { suspect = false, selected = false } = opts;
  const fill = suspect ? 'rgba(249,115,22,0.92)' : 'rgba(56,189,248,0.9)';
  const stroke = selected ? '#e6f0fa' : suspect ? '#fdba74' : '#0ea5e9';
  const size = vessel.lengthM > 200 ? 26 : vessel.lengthM > 120 ? 22 : 18;
  const ring = selected
    ? `<circle cx="12" cy="12" r="11" fill="none" stroke="#22d3ee" stroke-width="1.2" stroke-dasharray="3 3" />`
    : '';

  const html = `
    <div style="width:${size}px;height:${size}px;transform:rotate(${vessel.headingDeg}deg);">
      <svg viewBox="0 0 24 24" width="${size}" height="${size}">
        ${ring}
        ${VESSEL_SHAPE.replace('{fill}', fill).replace('{stroke}', stroke)}
      </svg>
    </div>`;

  return L.divIcon({
    html,
    className: 'oceanx-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
}

/** Small arrow glyph used for wind and current vector fields. */
export function vectorIcon(directionDeg: number, speed: number, color: string) {
  const length = Math.max(14, Math.min(30, 12 + speed * 2.2));
  const html = `
    <div style="width:${length}px;height:${length}px;transform:rotate(${directionDeg}deg);opacity:0.85;">
      <svg viewBox="0 0 24 24" width="${length}" height="${length}">
        <line x1="12" y1="21" x2="12" y2="5" stroke="${color}" stroke-width="1.8" stroke-linecap="round" />
        <path d="M12 3 L16 9 L8 9 Z" fill="${color}" />
      </svg>
    </div>`;

  return L.divIcon({ html, className: 'oceanx-marker', iconSize: [length, length], iconAnchor: [length / 2, length / 2] });
}

export function pinIcon(color: string, label?: string) {
  const html = `
    <div style="position:relative;width:22px;height:22px;">
      <span style="position:absolute;inset:0;border-radius:9999px;border:1px solid ${color};opacity:0.55;"></span>
      <span style="position:absolute;inset:6px;border-radius:9999px;background:${color};"></span>
      ${
        label
          ? `<span style="position:absolute;left:26px;top:2px;font:600 10px ui-monospace,monospace;color:${color};white-space:nowrap;">${label}</span>`
          : ''
      }
    </div>`;
  return L.divIcon({ html, className: 'oceanx-marker', iconSize: [22, 22], iconAnchor: [11, 11] });
}
