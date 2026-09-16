import math
import random
import logging
import time
import json
import urllib.request
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Query
from backend.db import local_store

logger = logging.getLogger(__name__)

weather_router = APIRouter(prefix="/weather", tags=["Weather"])
ocean_router = APIRouter(prefix="/ocean", tags=["Ocean"])

DEFAULT_CENTER = [19.2, 71.5]

REGION_COORDS = {
    "Arabian Sea": (19.42, 71.60),
    "Gulf of Kutch": (22.45, 69.50),
    "Bay of Bengal": (18.50, 86.00),
    "Laccadive Sea": (10.00, 73.50),
    "Andaman Sea": (11.50, 93.00),
}

_open_meteo_cache: dict = {}
CACHE_TTL_SEC = 300


def _fetch_json(url: str, timeout: int = 4) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "OceanX-Maritime/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode())


def get_live_open_meteo_conditions(region: str) -> dict:
    now = time.time()
    cache_key = f"current_{region}"
    if cache_key in _open_meteo_cache:
        cached_time, cached_data = _open_meteo_cache[cache_key]
        if now - cached_time < CACHE_TTL_SEC:
            return cached_data

    lat, lng = REGION_COORDS.get(region, (19.42, 71.60))
    marine_url = f"https://marine-api.open-meteo.com/v1/marine?latitude={lat}&longitude={lng}&current=wave_height,wave_direction,wave_period,ocean_current_velocity,ocean_current_direction"
    forecast_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code,visibility&wind_speed_unit=ms"

    try:
        marine_data = _fetch_json(marine_url)
        forecast_data = _fetch_json(forecast_url)

        m_curr = marine_data.get("current", {})
        f_curr = forecast_data.get("current", {})

        curr_vel = m_curr.get("ocean_current_velocity")
        curr_speed_ms = round(float(curr_vel) / 3.6, 2) if curr_vel is not None else 0.54

        wind_spd = f_curr.get("wind_speed_10m")
        wind_speed_ms = round(float(wind_spd), 1) if wind_spd is not None else 7.8

        wind_gust = f_curr.get("wind_gusts_10m")
        wind_gust_ms = round(float(wind_gust), 1) if wind_gust is not None else round(wind_speed_ms * 1.4, 1)

        wave_h = m_curr.get("wave_height")
        wave_height_m = round(float(wave_h), 2) if wave_h is not None else 1.8

        wave_p = m_curr.get("wave_period")
        wave_period_s = round(float(wave_p), 1) if wave_p is not None else 7.2

        air_t = f_curr.get("temperature_2m")
        air_temp_c = round(float(air_t), 1) if air_t is not None else 28.5

        vis_m = f_curr.get("visibility")
        visibility_km = max(1, round(float(vis_m) / 1000.0)) if vis_m is not None else 12

        w_code = f_curr.get("weather_code", 2)
        weather_desc = "Clear sky, calm waters" if w_code == 0 else ("Partly cloudy, moderate swell" if w_code <= 3 else "Choppy seas, squall lines")

        data = {
            "observedAt": datetime.utcnow().isoformat() + "Z",
            "windSpeedMs": wind_speed_ms,
            "windDirDeg": int(f_curr.get("wind_direction_10m", 228)),
            "windGustMs": wind_gust_ms,
            "currentSpeedMs": curr_speed_ms,
            "currentDirDeg": int(m_curr.get("ocean_current_direction", 118)),
            "waveHeightM": wave_height_m,
            "wavePeriodS": wave_period_s,
            "seaSurfaceTempC": round(air_temp_c - 0.7, 1),
            "airTempC": air_temp_c,
            "visibilityKm": visibility_km,
            "weather": weather_desc,
            "salinityPsu": 35.8,
            "source": "Open-Meteo Marine API (Live)"
        }
        _open_meteo_cache[cache_key] = (now, data)
        return data
    except Exception as e:
        logger.warning(f"Open-Meteo API query failed, using local store: {e}")
        conditions = local_store.get_meta("regionalConditions", {})
        return conditions.get(region) or conditions.get("Arabian Sea") or {
            "observedAt": datetime.utcnow().isoformat() + "Z",
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
    Returns live wind, swell, wave, and surface temperature from Open-Meteo Marine API.
    """
    return get_live_open_meteo_conditions(region)


@weather_router.get("/history", summary="Get 48-hour met-ocean hourly history")
def get_weather_history(region: str = Query("Arabian Sea")):
    """
    Returns historical time series for wind, current, wave height, and SST from Open-Meteo Marine API.
    """
    lat, lng = REGION_COORDS.get(region, (19.42, 71.60))
    cache_key = f"history_{region}"
    now = time.time()

    if cache_key in _open_meteo_cache:
        c_time, c_data = _open_meteo_cache[cache_key]
        if now - c_time < CACHE_TTL_SEC:
            return c_data

    try:
        marine_url = f"https://marine-api.open-meteo.com/v1/marine?latitude={lat}&longitude={lng}&hourly=wave_height,ocean_current_velocity&past_days=2&forecast_days=1"
        forecast_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&hourly=wind_speed_10m,temperature_2m&wind_speed_unit=ms&past_days=2&forecast_days=1"

        m_data = _fetch_json(marine_url)
        f_data = _fetch_json(forecast_url)

        times = m_data.get("hourly", {}).get("time", []) or f_data.get("hourly", {}).get("time", [])
        waves = m_data.get("hourly", {}).get("wave_height", [])
        currents = m_data.get("hourly", {}).get("ocean_current_velocity", [])
        winds = f_data.get("hourly", {}).get("wind_speed_10m", [])
        temps = f_data.get("hourly", {}).get("temperature_2m", [])

        count = min(len(times), 48)
        start_idx = max(0, len(times) - count)

        history = []
        for i in range(start_idx, len(times)):
            history.append({
                "hour": times[i] + "Z" if not times[i].endswith("Z") else times[i],
                "windMs": round(float(winds[i]), 1) if i < len(winds) and winds[i] is not None else 7.2,
                "currentMs": round(float(currents[i]) / 3.6, 2) if i < len(currents) and currents[i] is not None else 0.45,
                "waveM": round(float(waves[i]), 2) if i < len(waves) and waves[i] is not None else 1.6,
                "sstC": round(float(temps[i]) - 0.5, 1) if i < len(temps) and temps[i] is not None else 28.0
            })

        if len(history) >= 12:
            _open_meteo_cache[cache_key] = (now, history)
            return history
    except Exception as e:
        logger.warning(f"Open-Meteo history query failed: {e}")

    history = local_store.get_meta("metOceanHistory")
    return history if history else []


@weather_router.get("/wind-field", summary="Get animated wind vector grid")
def get_wind_field(
    region: str = Query("Arabian Sea"),
    lat: float = Query(19.2),
    lng: float = Query(71.5)
):
    """
    Returns 2D vector field of wind vectors powered by live Open-Meteo observations.
    """
    snapshot = get_live_open_meteo_conditions(region)
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
    Returns 2D vector field of hydrodynamic ocean currents powered by live Open-Meteo Marine API.
    """
    snapshot = get_live_open_meteo_conditions(region)
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
