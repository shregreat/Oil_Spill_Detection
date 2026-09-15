'use client';

import { useEffect, useMemo, useState } from 'react';
import { Filter, Search, Ship } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { MapView } from '@/components/map/MapView';
import { MapLegend } from '@/components/map/MapLegend';
import { Panel, KeyValue, KeyValueGrid } from '@/components/ui/Panel';
import { ToggleChip } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { VesselTable } from '@/components/vessels/VesselTable';
import { useAsyncData } from '@/hooks/useAsyncData';
import { aisService, VESSEL_TYPES } from '@/services';
import { useQueryParam } from '@/hooks/useQueryParam';
import { DEFAULT_LAYER_STATE } from '@/lib/constants';
import type { MapLayerId } from '@/lib/mapLayers';
import type { VesselType } from '@/lib/types';
import { compass, formatDateTime, formatLatLng, relativeTime } from '@/lib/utils';

const AIS_LAYERS: Record<MapLayerId, boolean> = {
  ...DEFAULT_LAYER_STATE,
  spillPolygon: false,
  spillCentroid: false,
  spillConfidence: false,
  hindcast: false,
  forecast: false,
  uncertainty: false
};

export default function AisPage() {
  const initialMmsi = useQueryParam('mmsi');

  const [search, setSearch] = useState('');
  const [types, setTypes] = useState<VesselType[]>([]);
  const [onlyMoving, setOnlyMoving] = useState(false);
  const [minSpeed, setMinSpeed] = useState(0);
  const [selectedMmsi, setSelectedMmsi] = useState<string | null>(null);

  useEffect(() => {
    if (initialMmsi) setSelectedMmsi(initialMmsi);
  }, [initialMmsi]);

  const { data, status, error, refetch, isEmpty } = useAsyncData(
    () => aisService.listVessels({ search, types, onlyMoving, minSpeedKn: minSpeed }),
    [search, types.join(','), onlyMoving, minSpeed]
  );

  const selected = useMemo(
    () => data?.find((v) => v.mmsi === selectedMmsi) ?? data?.[0] ?? null,
    [data, selectedMmsi]
  );

  const track = useAsyncData(
    () => (selected ? aisService.getTrack(selected.mmsi) : Promise.resolve(null)),
    [selected?.mmsi]
  );

  const toggleType = (type: VesselType) =>
    setTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));

  return (
    <div className="space-y-3 p-3 lg:space-y-4 lg:p-4">
      <PageHeader
        title="AIS Vessel Tracking"
        description="Search the tracked fleet, inspect AIS reports and follow historic tracks for any vessel of interest."
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-3">
          <div className="relative h-[44vh] min-h-[300px] overflow-hidden rounded-xl border border-line/80 shadow-panel">
            <MapView
              layers={AIS_LAYERS}
              vessels={data ?? []}
              tracks={track.data ? [track.data] : []}
              selectedMmsi={selected?.mmsi ?? null}
              onSelectVessel={setSelectedMmsi}
              fitTo={selected ? [selected.position] : null}
              zoom={7}
            />
            <div className="absolute bottom-3 left-3 z-[1000] hidden sm:block">
              <MapLegend visible={AIS_LAYERS} />
            </div>
          </div>

          <Panel
            title="Filters"
            subtitle="Vessel type, movement and speed"
            actions={<Filter className="h-3.5 w-3.5 text-muted" />}
          >
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, MMSI, IMO, call sign or operator"
                  className="input pl-9"
                  aria-label="Search vessels"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {VESSEL_TYPES.map((t) => (
                  <ToggleChip key={t} active={types.includes(t)} onClick={() => toggleType(t)}>
                    {t}
                  </ToggleChip>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <ToggleChip active={onlyMoving} onClick={() => setOnlyMoving((v) => !v)}>
                  Under way only
                </ToggleChip>
                <label className="flex items-center gap-2 text-[11px] text-muted">
                  Min speed
                  <input
                    type="range"
                    min={0}
                    max={18}
                    value={minSpeed}
                    onChange={(e) => setMinSpeed(Number(e.target.value))}
                    className="h-1.5 w-28 cursor-pointer appearance-none rounded-full bg-deep accent-cyan-400"
                  />
                  <span className="font-mono text-ink">{minSpeed} kn</span>
                </label>
              </div>
            </div>
          </Panel>

          <Panel title="Tracked vessels" subtitle={`${data?.length ?? 0} matching AIS targets`} flush>
            {status === 'loading' && <LoadingState className="p-4" label="Querying AIS service" rows={3} />}
            {status === 'error' && <ErrorState className="m-4" description={error ?? undefined} onRetry={refetch} />}
            {isEmpty && <EmptyState className="m-4" title="No vessels match these filters" />}
            {status === 'success' && data && data.length > 0 && (
              <VesselTable vessels={data} selectedMmsi={selected?.mmsi} onSelect={setSelectedMmsi} />
            )}
          </Panel>
        </div>

        <Panel
          title="Vessel details"
          subtitle={selected ? selected.name : 'Select a vessel'}
          actions={<Ship className="h-3.5 w-3.5 text-muted" />}
        >
          {!selected && <EmptyState title="No vessel selected" description="Pick a target on the map or in the table." />}

          {selected && (
            <div className="space-y-3">
              <KeyValueGrid columns={2}>
                <KeyValue label="Name" value={selected.name} />
                <KeyValue label="MMSI" value={selected.mmsi} />
                <KeyValue label="IMO" value={selected.imo} />
                <KeyValue label="Call sign" value={selected.callSign} />
                <KeyValue label="Type" value={selected.type} />
                <KeyValue label="Flag" value={selected.flag} />
                <KeyValue label="Speed" value={`${selected.speedKn} kn`} />
                <KeyValue label="Heading" value={`${selected.headingDeg}°`} />
                <KeyValue
                  label="Course"
                  value={`${selected.courseDeg}°`}
                  hint={compass(selected.courseDeg)}
                />
                <KeyValue label="Rate of turn" value={`${selected.rateOfTurn}°/min`} />
                <KeyValue label="Nav status" value={selected.navStatus} />
                <KeyValue label="AIS class" value={selected.aisClass} />
                <KeyValue label="Position" value={formatLatLng(selected.position)} />
                <KeyValue
                  label="Timestamp"
                  value={formatDateTime(selected.timestamp)}
                  hint={relativeTime(selected.timestamp)}
                />
                <KeyValue label="Dimensions" value={`${selected.lengthM} × ${selected.beamM} m`} />
                <KeyValue label="Draught" value={`${selected.draughtM} m`} />
                <KeyValue label="Gross tonnage" value={selected.grossTonnage.toLocaleString('en-US')} />
                <KeyValue label="Destination" value={selected.destination} hint={`ETA ${formatDateTime(selected.eta)}`} />
              </KeyValueGrid>

              <div className="rounded-lg border border-line/70 bg-deep/50 p-3">
                <p className="label-xs">AIS track</p>
                <p className="mt-1 text-[11px] text-muted">
                  {track.data
                    ? `${track.data.points.length} position reports over the last 12 hours, rendered on the map.`
                    : 'Loading track history…'}
                </p>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
