# OceanX — Maritime Oil Spill Intelligence (Frontend)

Frontend for **SIH 2026 · Problem Statement 26143** — *leveraging satellite imagery to determine oil spills at sea,
with AIS data correlation to identify the vessel responsible for the spill.*

This repository currently contains **only the frontend**. There is no backend, database, ML model or real API
integration. Every screen is driven by a deterministic mock dataset behind a service layer, so the UI can be wired to a
real API later without being redesigned.

---

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. `/` redirects to `/dashboard`; sign-in lives at `/login`.

Other commands:

```bash
npm run build      # production build
npm run start      # serve the production build
npm run typecheck  # TypeScript, no emit
```

**Demo sign-in:** any registered operator email with a password of at least six characters. The login form is
prefilled with `a.nair@oceanx.gov.in` / `oceanx-demo`.

> Map basemaps (Esri World Imagery and CARTO dark) come from public tile servers, so tiles need an internet
> connection. All application data is local and offline.

---

## Tech stack

| Concern    | Choice                                  |
| ---------- | --------------------------------------- |
| Framework  | Next.js 14 (App Router) + React 18      |
| Language   | TypeScript (strict)                     |
| Styling    | Tailwind CSS (dark naval design tokens) |
| Animation  | Framer Motion                           |
| Mapping    | Leaflet + react-leaflet                 |
| Charts     | Recharts                                |
| Icons      | lucide-react                            |

---

## Routes

| Route             | Screen                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------- |
| `/login`          | Operator sign-in with mission briefing panel                                             |
| `/dashboard`      | Command dashboard: 9 stat cards + large operational map                                  |
| `/detection`      | Scene selection, imagery modes, AI pipeline run, measurements                             |
| `/incidents`      | Filterable incident list                                                                  |
| `/incidents/[id]` | Investigation: detection, environment, origin, AIS, attribution, forecast, timeline       |
| `/ais`            | Vessel map, search, filters, AIS table and vessel details                                 |
| `/attribution`    | Suspect ranking table, evidence package and behavioural charts                            |
| `/forecast`       | Hindcast + forward drift with animated time slider                                        |
| `/satellite`      | Scene catalogue, imagery viewer, footprint map, upcoming passes                           |
| `/timeline`       | Nine-stage analysis chain with timestamps and stage metrics                               |
| `/analytics`      | Detection, environmental and attribution analytics                                        |
| `/alerts`         | Alerts centre with severity triage and acknowledgement                                    |
| `/data-sources`   | Provider health and processing queue                                                      |
| `/model-status`   | Model registry, quality metrics and drift                                                 |
| `/settings`       | Thresholds, notifications, units, default map layers                                      |
| `/admin`          | User directory and role management                                                        |

---

## Folder structure

```
src/
  app/
    layout.tsx              root shell, metadata, global styles
    page.tsx                redirects to /dashboard
    globals.css             Tailwind layers + Leaflet theming
    login/page.tsx
    (app)/                  authenticated shell (sidebar + top bar)
      layout.tsx
      dashboard/ detection/ incidents/ incidents/[id]/
      ais/ attribution/ forecast/ satellite/ timeline/
      analytics/ alerts/ data-sources/ model-status/ settings/ admin/
  components/
    layout/      AppShell, Sidebar, TopBar, PageHeader, BottomSheet, ConnectionIndicator
    map/         MapView, MapCanvas, MapLayerControl, MapLegend, MapPopups, markers
    ui/          Panel, Button, MetricCard, StatusBadge, ConfidenceBadge, Tabs,
                 TimeSlider, ProcessingIndicator, States (loading/empty/error/success)
    incidents/   IncidentCard
    vessels/     VesselTable, VesselRanking, EvidencePanel
    satellite/   SatelliteViewer
    alerts/      AlertPanel
    timeline/    Timeline
    environment/ EnvironmentalPanel
    system/      DataSourceStatus
    charts/      ChartFrame, AreaTrend, LineTrend, BarSeries, ForecastChart
  hooks/         useAsyncData, useConnection, useMediaQuery, useQueryParam
  lib/
    types.ts       domain model shared by UI, mocks and the future backend
    utils.ts       formatting, geodesy helpers, seeded PRNG, fixed demo clock
    constants.ts   basemaps, default layer state, forecast horizons
    mapLayers.ts   the 13 operational map layers and legend metadata
    navigation.ts  sidebar structure
    mock/          vessels, incidents, satellite, environment, alerts, system, analytics
  services/        apiClient + incident/satellite/ais/weather/ocean/forecast/alert/
                   system/auth/websocket services
```

---

## Mock service layer

Components never call `fetch` and never hardcode values. They call a service, and every service goes through one
transport:

```ts
// src/services/apiClient.ts
apiClient.get<Incident[]>('/incidents', {
  latencyMs: 340,
  mock: () => applyFilter(INCIDENTS, filter)
});
```

- `NEXT_PUBLIC_USE_MOCKS=true` (default) resolves the `mock` resolver after a simulated latency, which is what makes
  loading states visible.
- `NEXT_PUBLIC_USE_MOCKS=false` performs a real HTTP request against `NEXT_PUBLIC_API_BASE_URL + path`.
  **No component changes are needed.**

Services: `apiClient`, `incidentService`, `satelliteService`, `aisService`, `weatherService`, `oceanService`,
`forecastService`, `alertService`, `systemService`, `authService`, `websocketService`.

### Realtime

`websocketService.subscribe(listener)` emits typed `StreamEvent`s (`connection`, `alert`, `incident_updated`,
`ais_tick`, `pipeline`). A scripted mock driver replays a fixed sequence today; swapping it for a WebSocket/SSE client
requires no UI change. The header shows the channel state as **LIVE / CONNECTING / OFFLINE**.

### Deterministic data

All demo data is generated from fixed seeds (`seededRandom`) against a fixed demo clock (`DEMO_NOW`), so values,
geometry and timestamps are identical on every refresh. Six incidents, 16 AIS vessels, 10 satellite scenes, 12 alerts,
9 data sources and 5 models cover the Arabian Sea, Gulf of Kutch, Gulf of Khambhat, Laccadive Sea and Bay of Bengal.

---

## Map layers

The geospatial canvas supports satellite imagery, spill polygons, spill centroid, spill confidence, AIS vessels,
vessel trajectories, suspect vessels, hindcast trajectory, forward forecast, wind vectors, ocean-current vectors,
uncertainty areas and a detection heatmap. Layers toggle through `MapLayerControl`, are documented in `MapLegend`, and
the map provides zoom, pan, reset, basemap switch and fullscreen controls plus vessel and incident popups.

---

## Responsiveness

- **Desktop (>= 1280 px):** persistent collapsible sidebar, large map with a side analytics column.
- **Tablet (768-1279 px):** sidebar becomes a drawer, panels stack below the map.
- **Mobile (< 768 px):** full-bleed map with a bottom sheet for incidents, alerts and conditions; tables scroll
  horizontally rather than being shrunk.

## UX states

Every data-driven page renders loading, empty, error (with retry), success and processing states through
`src/components/ui/States.tsx` and `ProcessingIndicator` (Queued -> Processing -> Detection -> Complete).

---

## Environment variables

Copy `.env.example` to `.env.local` when the backend exists:

```bash
NEXT_PUBLIC_USE_MOCKS=true
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/stream
```

## Scope note

Backend, database, ML inference, AIS ingestion and drift modelling are intentionally **not** implemented in this phase.
The contracts they must satisfy are defined in `src/lib/types.ts` and the service modules.
