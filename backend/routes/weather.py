import math
import random
import logging
from typing import Optional, List
from fastapi import APIRouter, Query
from backend.db import local_store

logger = logging.getLogger(__name__)

weather_router = APIRouter(prefix="/weather", tags=["Weather"])
ocean_router = APIRouter(prefix="/ocean", tags=["Ocean"])

DEFAULT_CENTER = [19.2, 71.5]


def _build_vector_field(
    center: list[float],
    base_speed: float,
    base_direction: float,
    seed: int = 17,
    span_deg: float = 0.9,
    grid_size: int = 6
) -> list[dict]:
    rng = random.Random(seed)
    samples = []
    step = (span_deg * 2.0) / max(1, grid_size - 1)

    for row in range(grid_size):
        for col in range(grid_size):
            lat = center[0] - span_deg + row * step
            lng = center[1] - span_deg + col * step
            spd = max(0.2, base_speed * (0.7 + rng.random() * 0.6))
            direction = (base_direction + (rng.random() - 0.5) * 40.0 + 360.0) % 360.0
            samples.append({
                "position": [round(lat, 4), round(lng, 4)],
                "speed": round(spd, 2),
                "directionDeg": round(direction, 0)
            })
    return samples


# ============================================================
# WEATHER ENDPOINTS
# ============================================================

@weather_router.get("/current", summary="Get current environmental conditions by region")
def get_current_weather(region: str = Query("Arabian Sea")):
    """
    Returns wind, swell, and sea surface temperature for the specified maritime region.
    """
    conditions = local_store.get_meta("regionalConditions", {})
    return conditions.get(region) or conditions.get("Arabian Sea") or {
        "observedAt": "2026-09-12T09:22:00.000Z",
        "windSpeedMs": 7.8,
        "windDirDeg": 228,
        "windGustMs": 11.4,
        "currentSpeedMs": 0.54,
        "currentDirDeg": 118,
        "waveHeightM": 1.9,
        "wavePeriodS": 7.4,
        "seaSurfaceTempC": 28.4,
        "airTempC": 29.1,
        "visibilityKm": 12,
        "weather": "Partly cloudy, moderate SW swell",
        "salinityPsu": 36.2
    }


@weather_router.get("/history", summary="Get 48-hour met-ocean hourly history")
def get_weather_history():
    """
    Returns historical time series for wind, current, wave height, and SST.
    """
    history = local_store.get_meta("metOceanHistory")
    if history:
        return history
    return []


@weather_router.get("/wind-field", summary="Get animated wind vector grid")
def get_wind_field(
    region: str = Query("Arabian Sea"),
    lat: float = Query(19.2),
    lng: float = Query(71.5)
):
    """
    Returns 2D vector field of wind vectors powering the animated map particle layer.
    """
    conditions = local_store.get_meta("regionalConditions", {})
    snapshot = conditions.get(region) or conditions.get("Arabian Sea", {})
    spd = snapshot.get("windSpeedMs", 7.8)
    dir_deg = snapshot.get("windDirDeg", 228)
    return _build_vector_field([lat, lng], spd, dir_deg, seed=17)


# ============================================================
# OCEAN ENDPOINTS
# ============================================================

@ocean_router.get("/current-field", summary="Get ocean hydrodynamic current vector grid")
def get_current_field(
    region: str = Query("Arabian Sea"),
    lat: float = Query(19.2),
    lng: float = Query(71.5)
):
    """
    Returns 2D vector field of hydrodynamic ocean currents for drift simulation.
    """
    conditions = local_store.get_meta("regionalConditions", {})
    snapshot = conditions.get(region) or conditions.get("Arabian Sea", {})
    spd = snapshot.get("currentSpeedMs", 0.54) * 10.0
    dir_deg = snapshot.get("currentDirDeg", 118)
    return _build_vector_field([lat, lng], spd, dir_deg, seed=29)


@ocean_router.get("/detection-heatmap", summary="Get historical spill detection intensity points")
def get_detection_heatmap():
    """
    Returns density heatmap points from past spill incidents.
    """
    incidents = local_store.list_incidents()
    points = []
    rng = random.Random(91)

    for idx, inc in enumerate(incidents):
        centroid = inc.get("slick", {}).get("centroid", [19.2, 71.5])
        count = 8 + (idx % 3) * 3
        for _ in range(count):
            lat = centroid[0] + (rng.random() - 0.5) * 0.9
            lng = centroid[1] + (rng.random() - 0.5) * 0.9
            intensity = 0.25 + rng.random() * 0.75
            points.append({
                "position": [round(lat, 4), round(lng, 4)],
                "intensity": round(intensity, 2)
            })

    return points


@ocean_router.get("/tides", summary="Get coastal station tide predictions")
def get_tides():
    """
    Returns upcoming high and low tide times and tidal range.
    """
    return {
        "station": "Mumbai (Apollo Bandar)",
        "nextHighAt": "2026-09-12T13:24:00.000Z",
        "nextLowAt": "2026-09-12T19:48:00.000Z",
        "rangeM": 3.4
    }
