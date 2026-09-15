'use client';

import Link from 'next/link';
import { ArrowUpRight, Gauge, Ruler, Ship } from 'lucide-react';
import type { Incident, Vessel } from '@/lib/types';
import { compass, formatDateTime, formatLatLng, pct, relativeTime } from '@/lib/utils';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { IncidentStatusBadge, SeverityBadge } from '@/components/ui/StatusBadge';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-[10px] uppercase tracking-wider text-muted">{label}</span>
      <span className="font-mono text-[11px] text-ink">{value}</span>
    </div>
  );
}

export function IncidentPopup({ incident }: { incident: Incident }) {
  const suspect = incident.suspects[0];
  return (
    <div className="w-full p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[11px] text-accent">{incident.id}</p>
          <p className="mt-0.5 text-xs font-semibold leading-snug text-ink">{incident.title}</p>
        </div>
        <ConfidenceBadge confidence={incident.detection.confidence} />
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <SeverityBadge severity={incident.severity} />
        <IncidentStatusBadge status={incident.status} />
      </div>

      <div className="mt-2 divide-y divide-line/60 border-y border-line/60">
        <Row label="Detected" value={`${formatDateTime(incident.detectedAt)} (${relativeTime(incident.detectedAt)})`} />
        <Row label="Area" value={`${incident.slick.areaKm2} km\u00b2`} />
        <Row label="Length / Width" value={`${incident.slick.lengthKm} / ${incident.slick.widthKm} km`} />
        <Row label="Centroid" value={formatLatLng(incident.slick.centroid)} />
        <Row label="Origin confidence" value={pct(incident.origin.confidence, 0)} />
        {suspect && <Row label="Top suspect" value={`${suspect.name} (${suspect.responsibilityScore}/100)`} />}
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <Link
          href={`/incidents/${incident.id}`}
          className="inline-flex items-center gap-1 rounded-lg bg-accent/90 px-2.5 py-1 text-[11px] font-semibold text-abyss hover:bg-accent"
        >
          Open investigation <ArrowUpRight className="h-3 w-3" />
        </Link>
        <Link
          href={`/forecast?incident=${incident.id}`}
          className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-[11px] text-muted hover:text-ink"
        >
          <Ruler className="h-3 w-3" /> Drift
        </Link>
      </div>
    </div>
  );
}

export function VesselPopup({ vessel, suspect }: { vessel: Vessel; suspect?: { score: number; rank: number } }) {
  return (
    <div className="w-full p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-ink">{vessel.name}</p>
          <p className="mt-0.5 font-mono text-[11px] text-muted">
            MMSI {vessel.mmsi} · IMO {vessel.imo}
          </p>
        </div>
        {suspect && (
          <span className="rounded-full border border-sev-high/50 bg-sev-high/15 px-2 py-0.5 font-mono text-[10px] text-orange-300">
            #{suspect.rank} · {suspect.score}
          </span>
        )}
      </div>

      <div className="mt-2 divide-y divide-line/60 border-y border-line/60">
        <Row label="Type" value={vessel.type} />
        <Row label="Flag" value={vessel.flag} />
        <Row label="Speed" value={`${vessel.speedKn} kn`} />
        <Row label="Heading / Course" value={`${vessel.headingDeg}\u00b0 / ${vessel.courseDeg}\u00b0 ${compass(vessel.courseDeg)}`} />
        <Row label="Nav status" value={vessel.navStatus} />
        <Row label="Position" value={formatLatLng(vessel.position)} />
        <Row label="Last report" value={`${formatDateTime(vessel.timestamp)} (${relativeTime(vessel.timestamp)})`} />
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <Link
          href={`/ais?mmsi=${vessel.mmsi}`}
          className="inline-flex items-center gap-1 rounded-lg bg-accent/90 px-2.5 py-1 text-[11px] font-semibold text-abyss hover:bg-accent"
        >
          <Ship className="h-3 w-3" /> Track vessel
        </Link>
        <Link
          href={`/attribution?mmsi=${vessel.mmsi}`}
          className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-[11px] text-muted hover:text-ink"
        >
          <Gauge className="h-3 w-3" /> Attribution
        </Link>
      </div>
    </div>
  );
}
