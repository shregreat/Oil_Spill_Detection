'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import { Crosshair, Layers2, Maximize2, Minus, Plus, Satellite, Loader2 } from 'lucide-react';

// Safeguard against React 18 / StrictMode / Fast Refresh / page navigation:
// Leaflet does not delete container._leaflet_id on remove() when passed an HTMLElement,
// which causes "Map container is already initialized."
if (typeof window !== 'undefined' && L?.Map?.prototype) {
  const mapProto = L.Map.prototype as unknown as {
    _initContainer: (id: string | HTMLElement) => void;
    __oceanx_patched?: boolean;
  };

  if (!mapProto.__oceanx_patched) {
    mapProto.__oceanx_patched = true;
    const originalInitContainer = mapProto._initContainer;
    mapProto._initContainer = function (id: string | HTMLElement) {
      const container = typeof id === 'string' ? document.getElementById(id) : id;
      if (container && (container as unknown as { _leaflet_id?: unknown })._leaflet_id) {
        delete (container as unknown as { _leaflet_id?: unknown })._leaflet_id;
      }
      return originalInitContainer.call(this, id);
    };
  }
}
import type {
  ForecastStep,
  HeatPoint,
  Incident,
  LatLng,
  Ring,
  VectorSample,
  Vessel,
  VesselTrack
} from '@/lib/types';
import { BASEMAPS, DEFAULT_LAYER_STATE, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, type BasemapId } from '@/lib/constants';
import { LAYER_BY_ID, type MapLayerId } from '@/lib/mapLayers';
import { cn } from '@/lib/utils';
import { pinIcon, vectorIcon, vesselIcon } from './markers';
import { IncidentPopup, VesselPopup } from './MapPopups';

export interface MapCanvasProps {
  center?: LatLng;
  zoom?: number;
  basemap?: BasemapId;
  layers?: Partial<Record<MapLayerId, boolean>>;
  incidents?: Incident[];
  vessels?: Vessel[];
  tracks?: VesselTrack[];
  suspects?: { mmsi: string; rank: number; score: number }[];
  hindcast?: LatLng[];
  origin?: { position: LatLng; ring: Ring; confidence: number } | null;
  forecast?: ForecastStep[];
  activeForecastIndex?: number;
  wind?: VectorSample[];
  currents?: VectorSample[];
  heat?: HeatPoint[];
  selectedIncidentId?: string | null;
  onSelectIncident?: (id: string) => void;
  selectedMmsi?: string | null;
  onSelectVessel?: (mmsi: string) => void;
  fitTo?: LatLng[] | null;
  showControls?: boolean;
  className?: string;
}

function FitBounds({ points }: { points: LatLng[] | null | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    const bounds = points.map((p) => [p[0], p[1]]) as LatLngBoundsExpression;
    map.fitBounds(bounds, { padding: [56, 56], maxZoom: 11, animate: true });
  }, [map, points]);
  return null;
}

function MapControls({
  onFullscreen,
  onResetView,
  basemap,
  onToggleBasemap
}: {
  onFullscreen: () => void;
  onResetView: () => void;
  basemap: BasemapId;
  onToggleBasemap: () => void;
}) {
  const map = useMap();

  const btn =
    'rounded-lg border border-line/90 bg-panel/90 p-2 text-muted shadow-panel backdrop-blur transition-colors hover:text-accent focus-ring';

  return (
    <div className="absolute right-3 top-3 z-[500] flex flex-col gap-1.5">
      <button type="button" aria-label="Zoom in" className={btn} onClick={() => map.zoomIn()}>
        <Plus className="h-4 w-4" />
      </button>
      <button type="button" aria-label="Zoom out" className={btn} onClick={() => map.zoomOut()}>
        <Minus className="h-4 w-4" />
      </button>
      <button type="button" aria-label="Reset view" className={btn} onClick={onResetView}>
        <Crosshair className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label={`Switch to ${basemap === 'satellite' ? 'nautical dark' : 'satellite'} basemap`}
        className={btn}
        onClick={onToggleBasemap}
      >
        {basemap === 'satellite' ? <Layers2 className="h-4 w-4" /> : <Satellite className="h-4 w-4" />}
      </button>
      <button type="button" aria-label="Toggle fullscreen" className={btn} onClick={onFullscreen}>
        <Maximize2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function MapCanvas({
  center = DEFAULT_MAP_CENTER,
  zoom = DEFAULT_MAP_ZOOM,
  basemap = 'satellite',
  layers,
  incidents = [],
  vessels = [],
  tracks = [],
  suspects = [],
  hindcast,
  origin,
  forecast = [],
  activeForecastIndex = 0,
  wind = [],
  currents = [],
  heat = [],
  selectedIncidentId,
  onSelectIncident,
  selectedMmsi,
  onSelectVessel,
  fitTo,
  showControls = true,
  className
}: MapCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [activeBasemap, setActiveBasemap] = useState<BasemapId>(basemap);
  const [mapRenderId] = useState(() => 'map-' + Math.random().toString(36).substring(2, 7));
  const [resetKey, setResetKey] = useState(0);

  const visible = useMemo(() => ({ ...DEFAULT_LAYER_STATE, ...layers }), [layers]);
  const suspectIndex = useMemo(
    () => new Map(suspects.map((s) => [s.mmsi, s])),
    [suspects]
  );

  const activeStep = forecast[Math.min(activeForecastIndex, Math.max(0, forecast.length - 1))];
  const forecastPath = useMemo(() => forecast.map((f) => f.centroid), [forecast]);

  useEffect(() => {
    return () => {
      if (wrapperRef.current) {
        const el = wrapperRef.current.querySelector('.leaflet-container') as (HTMLElement & { _leaflet_id?: unknown }) | null;
        if (el?._leaflet_id) {
          delete el._leaflet_id;
        }
      }
    };
  }, []);

  const toggleFullscreen = () => {
    const el = wrapperRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen?.();
    }
  };

  return (
    <div ref={wrapperRef} className={cn('relative h-full w-full overflow-hidden bg-abyss', className)}>
      <MapContainer
        key={mapRenderId}
        center={center}
        zoom={zoom}
        zoomControl={false}
        attributionControl
        className="h-full w-full"
        preferCanvas
      >
        {visible.satellite ? (
          <TileLayer url={BASEMAPS[activeBasemap].url} attribution={BASEMAPS[activeBasemap].attribution} />
        ) : (
          <TileLayer url={BASEMAPS.dark.url} attribution={BASEMAPS.dark.attribution} />
        )}

        <FitBounds points={fitTo} />

        {/* Detection heatmap ------------------------------------------------ */}
        {visible.heatmap &&
          heat.map((point, i) => (
            <CircleMarker
              key={`heat-${i}`}
              center={point.position}
              radius={10 + point.intensity * 22}
              pathOptions={{
                color: 'transparent',
                fillColor: LAYER_BY_ID.heatmap.color,
                fillOpacity: 0.06 + point.intensity * 0.16
              }}
            />
          ))}

        {/* Uncertainty ------------------------------------------------------ */}
        {visible.uncertainty && origin && (
          <Polygon
            positions={origin.ring}
            pathOptions={{
              color: LAYER_BY_ID.uncertainty.color,
              weight: 1,
              dashArray: '4 4',
              fillColor: LAYER_BY_ID.uncertainty.color,
              fillOpacity: 0.08
            }}
          >
            <Tooltip sticky>Origin uncertainty envelope</Tooltip>
          </Polygon>
        )}
        {visible.uncertainty && activeStep && (
          <Polygon
            positions={activeStep.uncertaintyRing}
            pathOptions={{
              color: LAYER_BY_ID.uncertainty.color,
              weight: 1,
              dashArray: '2 6',
              fillColor: LAYER_BY_ID.uncertainty.color,
              fillOpacity: 0.06
            }}
          >
            <Tooltip sticky>{`Forecast uncertainty +${activeStep.horizonHours}h`}</Tooltip>
          </Polygon>
        )}

        {/* Spill polygons --------------------------------------------------- */}
        {incidents.map((incident) => {
          const isSelected = incident.id === selectedIncidentId;
          return (
            <Fragment key={incident.id}>
              {visible.spillConfidence && (
                <Circle
                  center={incident.slick.centroid}
                  radius={2000 + incident.detection.confidence * 9000}
                  pathOptions={{
                    color: LAYER_BY_ID.spillConfidence.color,
                    weight: 1,
                    opacity: 0.35,
                    fillColor: LAYER_BY_ID.spillConfidence.color,
                    fillOpacity: 0.05 + incident.detection.confidence * 0.06
                  }}
                />
              )}

              {visible.spillPolygon && (
                <Polygon
                  positions={incident.slick.polygon}
                  eventHandlers={{ click: () => onSelectIncident?.(incident.id) }}
                  pathOptions={{
                    color: LAYER_BY_ID.spillPolygon.color,
                    weight: isSelected ? 2.4 : 1.4,
                    fillColor: LAYER_BY_ID.spillPolygon.color,
                    fillOpacity: isSelected ? 0.42 : 0.26
                  }}
                >
                  <Popup>
                    <IncidentPopup incident={incident} />
                  </Popup>
                  <Tooltip direction="top" offset={[0, -6]}>
                    {`${incident.id} \u00b7 ${incident.slick.areaKm2} km\u00b2`}
                  </Tooltip>
                </Polygon>
              )}

              {visible.spillCentroid && (
                <Marker
                  position={incident.slick.centroid}
                  icon={pinIcon(LAYER_BY_ID.spillCentroid.color, incident.id.slice(-4))}
                  eventHandlers={{ click: () => onSelectIncident?.(incident.id) }}
                >
                  <Popup>
                    <IncidentPopup incident={incident} />
                  </Popup>
                </Marker>
              )}
            </Fragment>
          );
        })}

        {/* Hindcast + origin ------------------------------------------------ */}
        {visible.hindcast && hindcast && hindcast.length > 1 && (
          <>
            <Polyline
              positions={hindcast}
              pathOptions={{ color: LAYER_BY_ID.hindcast.color, weight: 2, dashArray: '6 6', opacity: 0.9 }}
            >
              <Tooltip sticky>Hindcast drift (backward)</Tooltip>
            </Polyline>
            {origin && (
              <Marker position={origin.position} icon={pinIcon(LAYER_BY_ID.hindcast.color, 'ORIGIN')}>
                <Tooltip direction="top">{`Estimated origin \u00b7 ${Math.round(origin.confidence * 100)}% confidence`}</Tooltip>
              </Marker>
            )}
          </>
        )}

        {/* Forward forecast ------------------------------------------------- */}
        {visible.forecast && forecast.length > 0 && (
          <>
            <Polyline
              positions={forecastPath}
              pathOptions={{ color: LAYER_BY_ID.forecast.color, weight: 2, opacity: 0.85 }}
            >
              <Tooltip sticky>Forward drift track</Tooltip>
            </Polyline>
            {activeStep && (
              <Polygon
                positions={activeStep.polygon}
                pathOptions={{
                  color: LAYER_BY_ID.forecast.color,
                  weight: 1.6,
                  fillColor: LAYER_BY_ID.forecast.color,
                  fillOpacity: 0.2
                }}
              >
                <Tooltip direction="top">{`+${activeStep.horizonHours}h \u00b7 ${activeStep.areaKm2} km\u00b2`}</Tooltip>
              </Polygon>
            )}
            {forecast.map((step, idx) => (
              <CircleMarker
                key={`fc-${step.horizonHours}`}
                center={step.centroid}
                radius={idx === activeForecastIndex ? 6 : 3.5}
                pathOptions={{
                  color: LAYER_BY_ID.forecast.color,
                  weight: idx === activeForecastIndex ? 2 : 1,
                  fillColor: '#04101f',
                  fillOpacity: 1
                }}
              >
                <Tooltip direction="top">{`+${step.horizonHours}h`}</Tooltip>
              </CircleMarker>
            ))}
          </>
        )}

        {/* Vessel tracks ---------------------------------------------------- */}
        {visible.vesselTracks &&
          tracks.map((track) => {
            const isSuspect = suspectIndex.has(track.mmsi);
            return (
              <Polyline
                key={`track-${track.mmsi}`}
                positions={track.points.map((p) => p.position)}
                pathOptions={{
                  color: isSuspect ? LAYER_BY_ID.suspectVessels.color : LAYER_BY_ID.vesselTracks.color,
                  weight: track.mmsi === selectedMmsi ? 2.6 : 1.4,
                  opacity: track.mmsi === selectedMmsi ? 0.95 : 0.6
                }}
              >
                <Tooltip sticky>{`${track.name} \u00b7 AIS track`}</Tooltip>
              </Polyline>
            );
          })}

        {/* Vessels ---------------------------------------------------------- */}
        {vessels.map((vessel) => {
          const suspect = suspectIndex.get(vessel.mmsi);
          if (suspect && !visible.suspectVessels) return null;
          if (!suspect && !visible.aisVessels) return null;
          return (
            <Marker
              key={`v-${vessel.mmsi}`}
              position={vessel.position}
              icon={vesselIcon(vessel, { suspect: Boolean(suspect), selected: vessel.mmsi === selectedMmsi })}
              eventHandlers={{ click: () => onSelectVessel?.(vessel.mmsi) }}
            >
              <Popup>
                <VesselPopup vessel={vessel} suspect={suspect} />
              </Popup>
              <Tooltip direction="top" offset={[0, -10]}>
                {`${vessel.name} \u00b7 ${vessel.speedKn} kn`}
              </Tooltip>
            </Marker>
          );
        })}

        {/* Environmental vector fields -------------------------------------- */}
        {visible.wind &&
          wind.map((sample, i) => (
            <Marker
              key={`wind-${i}`}
              position={sample.position}
              icon={vectorIcon(sample.directionDeg, sample.speed, LAYER_BY_ID.wind.color)}
              interactive={false}
            />
          ))}
        {visible.currents &&
          currents.map((sample, i) => (
            <Marker
              key={`cur-${i}`}
              position={sample.position}
              icon={vectorIcon(sample.directionDeg, sample.speed, LAYER_BY_ID.currents.color)}
              interactive={false}
            />
          ))}

        {showControls && (
          <MapControls
            key={resetKey}
            basemap={activeBasemap}
            onToggleBasemap={() => setActiveBasemap((b) => (b === 'satellite' ? 'dark' : 'satellite'))}
            onFullscreen={toggleFullscreen}
            onResetView={() => setResetKey((k) => k + 1)}
          />
        )}

        <ResetView trigger={resetKey} center={center} zoom={zoom} />
      </MapContainer>
    </div>
  );
}

function ResetView({ trigger, center, zoom }: { trigger: number; center: LatLng; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (trigger === 0) return;
    map.flyTo(center, zoom, { duration: 0.8 });
  }, [trigger, map, center, zoom]);
  return null;
}
