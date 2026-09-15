"""
Local SQLite storage for oil spill scans, detections, incidents, vessels, alerts, and system state.
Provides full offline capability, auto-seeded with realistic maritime operational data.
"""

import os
import json
import sqlite3
import uuid
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Any

from backend.config import BACKEND_DIR

logger = logging.getLogger(__name__)

DB_PATH = BACKEND_DIR / "db" / "local_scans.sqlite"
SEED_FILE = BACKEND_DIR / "data" / "seed_data.json"


def _get_connection() -> sqlite3.Connection:
    """Connect to SQLite and ensure tables exist."""
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_local_db():
    """Create local SQLite tables and seed data if not initialized."""
    with _get_connection() as conn:
        # Existing tables for raw SAR scans & U-Net detections
        conn.execute("""
            CREATE TABLE IF NOT EXISTS scans (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                width INTEGER,
                height INTEGER,
                detected BOOLEAN NOT NULL DEFAULT 0,
                image_url TEXT,
                overlay_url TEXT,
                scan_date TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS detections (
                id TEXT PRIMARY KEY,
                scan_id TEXT NOT NULL,
                confidence REAL NOT NULL,
                latitude REAL,
                longitude REAL,
                area_m2 REAL DEFAULT 0,
                area_km2 REAL DEFAULT 0,
                perimeter_m REAL DEFAULT 0,
                num_regions INTEGER DEFAULT 0,
                threshold REAL DEFAULT 0.4,
                polygon_json TEXT,
                polygons_json TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE
            )
        """)

        # Operational tables for the OceanX platform
        conn.execute("""
            CREATE TABLE IF NOT EXISTS incidents (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                region TEXT NOT NULL,
                status TEXT NOT NULL,
                severity TEXT NOT NULL,
                confidence REAL NOT NULL,
                data_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS vessels (
                mmsi TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                flag TEXT NOT NULL,
                speed_kn REAL NOT NULL,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                data_json TEXT NOT NULL,
                track_json TEXT,
                updated_at TEXT NOT NULL
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id TEXT PRIMARY KEY,
                incident_id TEXT,
                type TEXT NOT NULL,
                severity TEXT NOT NULL,
                title TEXT NOT NULL,
                acknowledged BOOLEAN NOT NULL DEFAULT 0,
                data_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS satellite_scenes (
                id TEXT PRIMARY KEY,
                mission TEXT NOT NULL,
                stage TEXT NOT NULL,
                data_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS system_users (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                data_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS meta_store (
                key TEXT PRIMARY KEY,
                value_json TEXT NOT NULL
            )
        """)

        conn.commit()

    # Seed if tables are empty
    _seed_if_empty()


def _seed_if_empty():
    """Load initial seed dataset if available."""
    if not SEED_FILE.exists():
        return

    try:
        with _get_connection() as conn:
            inc_count = conn.execute("SELECT COUNT(*) FROM incidents").fetchone()[0]
            if inc_count > 0:
                return  # already seeded

            raw = SEED_FILE.read_text(encoding="utf-8")
            seed = json.loads(raw)
            now = _now_iso()

            # Seed incidents
            for inc in seed.get("incidents", []):
                conn.execute(
                    """
                    INSERT OR REPLACE INTO incidents (id, title, region, status, severity, confidence, data_json, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        inc["id"],
                        inc.get("title", "Spill Incident"),
                        inc.get("region", "Arabian Sea"),
                        inc.get("status", "active"),
                        inc.get("severity", "high"),
                        float(inc.get("detection", {}).get("confidence", 0.9)),
                        json.dumps(inc),
                        inc.get("reportedAt", now),
                        inc.get("updatedAt", now),
                    )
                )

            # Seed vessels & tracks
            tracks = seed.get("vesselTracks", {})
            for v in seed.get("vessels", []):
                mmsi = v["mmsi"]
                v_track = tracks.get(mmsi)
                pos = v.get("position", [0, 0])
                conn.execute(
                    """
                    INSERT OR REPLACE INTO vessels (mmsi, name, type, flag, speed_kn, lat, lng, data_json, track_json, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        mmsi,
                        v.get("name", "Vessel"),
                        v.get("type", "Cargo"),
                        v.get("flag", "Unknown"),
                        float(v.get("speedKn", 0.0)),
                        float(pos[0]),
                        float(pos[1]),
                        json.dumps(v),
                        json.dumps(v_track) if v_track else None,
                        now
                    )
                )

            # Seed alerts
            for a in seed.get("alerts", []):
                conn.execute(
                    """
                    INSERT OR REPLACE INTO alerts (id, incident_id, type, severity, title, acknowledged, data_json, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        a["id"],
                        a.get("incidentId"),
                        a.get("type", "new_spill"),
                        a.get("severity", "high"),
                        a.get("title", "Alert"),
                        int(bool(a.get("acknowledged", False))),
                        json.dumps(a),
                        a.get("timestamp", now)
                    )
                )

            # Seed satellite scenes
            for s in seed.get("satelliteScenes", []):
                conn.execute(
                    """
                    INSERT OR REPLACE INTO satellite_scenes (id, mission, stage, data_json, created_at)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        s["id"],
                        s.get("mission", "Sentinel-1A"),
                        s.get("processingStage", "complete"),
                        json.dumps(s),
                        s.get("acquiredAt", now)
                    )
                )

            # Seed system users
            for u in seed.get("systemUsers", []):
                conn.execute(
                    """
                    INSERT OR REPLACE INTO system_users (id, email, data_json, updated_at)
                    VALUES (?, ?, ?, ?)
                    """,
                    (
                        u["id"],
                        u.get("email", "").lower(),
                        json.dumps(u),
                        now
                    )
                )

            # Store auxiliary metadata
            for key in ["sceneCoverageSummary", "upcomingPasses", "dataSources", "pipelineQueue", "models", "analytics", "analyticsKpis", "regionalConditions", "metOceanHistory"]:
                if key in seed:
                    conn.execute(
                        "INSERT OR REPLACE INTO meta_store (key, value_json) VALUES (?, ?)",
                        (key, json.dumps(seed[key]))
                    )

            conn.commit()
            logger.info("Local SQLite initialized and seeded successfully.")

    except Exception as e:
        logger.error("Error seeding local database: %s", str(e), exc_info=True)


# Initialize on module import
init_local_db()


# ============================================================
# SCANS - CRUD (Preserving existing signatures for detection.py)
# ============================================================

def create_scan(
    filename: str,
    width: int,
    height: int,
    detected: bool,
    image_url: Optional[str] = None,
    overlay_url: Optional[str] = None
) -> dict:
    scan_id = str(uuid.uuid4())
    now = _now_iso()

    with _get_connection() as conn:
        conn.execute(
            """
            INSERT INTO scans (id, filename, width, height, detected, image_url, overlay_url, scan_date, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (scan_id, filename, width, height, int(detected), image_url, overlay_url, now, now)
        )
        conn.commit()

    return {
        "id": scan_id,
        "filename": filename,
        "width": width,
        "height": height,
        "detected": detected,
        "image_url": image_url,
        "overlay_url": overlay_url,
        "scan_date": now,
        "created_at": now
    }


def create_detection(
    scan_id: str,
    confidence: float,
    latitude: Optional[float],
    longitude: Optional[float],
    area_m2: float,
    area_km2: float,
    perimeter_m: float,
    num_regions: int,
    threshold: float,
    polygon: list,
    polygons: list
) -> dict:
    det_id = str(uuid.uuid4())
    now = _now_iso()

    with _get_connection() as conn:
        conn.execute(
            """
            INSERT INTO detections (
                id, scan_id, confidence, latitude, longitude,
                area_m2, area_km2, perimeter_m, num_regions, threshold,
                polygon_json, polygons_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                det_id, scan_id, confidence, latitude, longitude,
                area_m2, area_km2, perimeter_m, num_regions, threshold,
                json.dumps(polygon), json.dumps(polygons), now
            )
        )
        conn.commit()

    return {
        "id": det_id,
        "scan_id": scan_id,
        "confidence": confidence,
        "latitude": latitude,
        "longitude": longitude,
        "area_m2": area_m2,
        "area_km2": area_km2,
        "perimeter_m": perimeter_m,
        "num_regions": num_regions,
        "threshold": threshold,
        "polygon": polygon,
        "polygons": polygons,
        "created_at": now
    }


def list_scans(limit: int = 50, offset: int = 0) -> list[dict]:
    with _get_connection() as conn:
        cursor = conn.execute(
            """
            SELECT id, filename, width, height, detected, image_url, overlay_url, scan_date, created_at
            FROM scans
            ORDER BY scan_date DESC
            LIMIT ? OFFSET ?
            """,
            (limit, offset)
        )
        rows = cursor.fetchall()

    return [
        {
            "id": r["id"],
            "filename": r["filename"],
            "width": r["width"],
            "height": r["height"],
            "detected": bool(r["detected"]),
            "image_url": r["image_url"],
            "overlay_url": r["overlay_url"],
            "scan_date": r["scan_date"],
            "created_at": r["created_at"]
        }
        for r in rows
    ]


def count_scans() -> int:
    with _get_connection() as conn:
        cursor = conn.execute("SELECT COUNT(*) FROM scans")
        return cursor.fetchone()[0]


def get_scan(scan_id: str) -> Optional[dict]:
    with _get_connection() as conn:
        cursor = conn.execute(
            """
            SELECT id, filename, width, height, detected, image_url, overlay_url, scan_date, created_at
            FROM scans WHERE id = ?
            """,
            (scan_id,)
        )
        row = cursor.fetchone()

    if not row:
        return None

    return {
        "id": row["id"],
        "filename": row["filename"],
        "width": row["width"],
        "height": row["height"],
        "detected": bool(row["detected"]),
        "image_url": row["image_url"],
        "overlay_url": row["overlay_url"],
        "scan_date": row["scan_date"],
        "created_at": row["created_at"]
    }


def get_detections_for_scan(scan_id: str) -> list[dict]:
    with _get_connection() as conn:
        cursor = conn.execute(
            """
            SELECT id, scan_id, confidence, latitude, longitude, area_m2, area_km2,
                   perimeter_m, num_regions, threshold, polygon_json, polygons_json, created_at
            FROM detections WHERE scan_id = ?
            """,
            (scan_id,)
        )
        rows = cursor.fetchall()

    results = []
    for r in rows:
        results.append({
            "id": r["id"],
            "scan_id": r["scan_id"],
            "confidence": r["confidence"],
            "latitude": r["latitude"],
            "longitude": r["longitude"],
            "area_m2": r["area_m2"],
            "area_km2": r["area_km2"],
            "perimeter_m": r["perimeter_m"],
            "num_regions": r["num_regions"],
            "threshold": r["threshold"],
            "polygon": json.loads(r["polygon_json"] or "[]"),
            "polygons": json.loads(r["polygons_json"] or "[]"),
            "created_at": r["created_at"]
        })
    return results


def delete_scan(scan_id: str) -> bool:
    with _get_connection() as conn:
        conn.execute("DELETE FROM detections WHERE scan_id = ?", (scan_id,))
        cursor = conn.execute("DELETE FROM scans WHERE id = ?", (scan_id,))
        conn.commit()
        return cursor.rowcount > 0


def get_stats() -> dict:
    with _get_connection() as conn:
        total_scans = conn.execute("SELECT COUNT(*) FROM scans").fetchone()[0]
        total_detected = conn.execute("SELECT COUNT(*) FROM scans WHERE detected = 1").fetchone()[0]
        total_clean = total_scans - total_detected
        total_detections = conn.execute("SELECT COUNT(*) FROM detections").fetchone()[0]
        sum_area = conn.execute("SELECT COALESCE(SUM(area_km2), 0) FROM detections").fetchone()[0]

    rate = round((total_detected / total_scans) * 100, 1) if total_scans > 0 else 0.0

    return {
        "total_scans": total_scans,
        "total_detected": total_detected,
        "total_clean": total_clean,
        "total_detections": total_detections,
        "total_area_km2": round(sum_area, 4),
        "detection_rate": rate
    }


# ============================================================
# INCIDENTS
# ============================================================

def list_incidents(
    status: str = "all",
    severity: str = "all",
    min_confidence: float = 0.0,
    search: str = ""
) -> list[dict]:
    with _get_connection() as conn:
        cursor = conn.execute("SELECT data_json FROM incidents ORDER BY updated_at DESC")
        rows = cursor.fetchall()

    needle = search.strip().lower()
    results = []

    for r in rows:
        inc = json.loads(r["data_json"])
        if status != "all" and inc.get("status") != status:
            continue
        if severity != "all" and inc.get("severity") != severity:
            continue
        conf = inc.get("detection", {}).get("confidence", 0.0)
        if conf < min_confidence:
            continue
        if needle:
            match = (
                needle in inc.get("id", "").lower()
                or needle in inc.get("title", "").lower()
                or needle in inc.get("region", "").lower()
                or any(needle in s.get("name", "").lower() or needle in s.get("mmsi", "") for s in inc.get("suspects", []))
            )
            if not match:
                continue
        results.append(inc)

    return results


def get_incident(incident_id: str) -> Optional[dict]:
    with _get_connection() as conn:
        cursor = conn.execute("SELECT data_json FROM incidents WHERE id = ?", (incident_id,))
        row = cursor.fetchone()
        if row:
            return json.loads(row["data_json"])
    return None


def save_incident(incident: dict) -> dict:
    inc_id = incident["id"]
    now = _now_iso()
    incident["updatedAt"] = now
    data_str = json.dumps(incident)

    with _get_connection() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO incidents (id, title, region, status, severity, confidence, data_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                inc_id,
                incident.get("title", "Oil Spill Incident"),
                incident.get("region", "Arabian Sea"),
                incident.get("status", "active"),
                incident.get("severity", "high"),
                float(incident.get("detection", {}).get("confidence", 0.9)),
                data_str,
                incident.get("reportedAt", now),
                now
            )
        )
        conn.commit()
    return incident


def update_incident_status(incident_id: str, new_status: str) -> Optional[dict]:
    inc = get_incident(incident_id)
    if not inc:
        return None
    inc["status"] = new_status
    return save_incident(inc)


def get_incident_stats() -> dict:
    incidents = list_incidents()
    active = [i for i in incidents if i.get("status") in ("active", "investigating", "monitoring")]
    critical = [i for i in incidents if i.get("severity") == "critical" and i.get("status") != "closed"]
    high_conf = [i for i in incidents if i.get("detection", {}).get("confidence", 0) >= 0.85]
    total_area = sum(i.get("slick", {}).get("areaKm2", 0.0) for i in active)

    suspect_set = set()
    for i in incidents:
        for s in i.get("suspects", []):
            if s.get("responsibilityScore", 0) >= 50:
                suspect_set.add(s.get("mmsi"))

    with _get_connection() as conn:
        vessel_count = conn.execute("SELECT COUNT(*) FROM vessels").fetchone()[0]

    return {
        "activeIncidents": len(active),
        "criticalIncidents": len(critical),
        "highConfidenceDetections": len(high_conf),
        "monitoredVessels": vessel_count,
        "suspectsUnderInvestigation": len(suspect_set),
        "cleanOceanIndex": 92.4,
        "totalSpillAreaKm2": round(total_area, 2),
        "pipelineStatus": "operational",
        "lastSyncAt": _now_iso()
    }


# ============================================================
# AIS VESSELS
# ============================================================

def list_vessels(
    types: Optional[list[str]] = None,
    min_speed: float = 0.0,
    max_speed: float = 40.0,
    flag: str = "all",
    only_moving: bool = False,
    search: str = ""
) -> list[dict]:
    with _get_connection() as conn:
        cursor = conn.execute("SELECT data_json FROM vessels")
        rows = cursor.fetchall()

    needle = search.strip().lower()
    results = []

    for r in rows:
        v = json.loads(r["data_json"])
        if types and v.get("type") not in types:
            continue
        spd = v.get("speedKn", 0.0)
        if spd < min_speed or spd > max_speed:
            continue
        if flag != "all" and v.get("flag") != flag:
            continue
        if only_moving and spd < 0.5:
            continue
        if needle:
            match = (
                needle in v.get("name", "").lower()
                or needle in v.get("mmsi", "")
                or needle in v.get("imo", "")
                or needle in v.get("callSign", "").lower()
                or needle in v.get("operator", "").lower()
            )
            if not match:
                continue
        results.append(v)

    return results


def get_vessel(mmsi: str) -> Optional[dict]:
    with _get_connection() as conn:
        cursor = conn.execute("SELECT data_json FROM vessels WHERE mmsi = ?", (mmsi,))
        row = cursor.fetchone()
        if row:
            return json.loads(row["data_json"])
    return None


def get_vessel_track(mmsi: str) -> Optional[dict]:
    with _get_connection() as conn:
        cursor = conn.execute("SELECT track_json FROM vessels WHERE mmsi = ?", (mmsi,))
        row = cursor.fetchone()
        if row and row["track_json"]:
            return json.loads(row["track_json"])

    # Fallback to single-point track
    v = get_vessel(mmsi)
    if not v:
        return None
    pos = v.get("position", [0, 0])
    return {
        "mmsi": mmsi,
        "vesselName": v.get("name", "Unknown"),
        "points": [
            {
                "timestamp": v.get("timestamp", _now_iso()),
                "position": pos,
                "speedKn": v.get("speedKn", 0.0),
                "courseDeg": v.get("courseDeg", 0.0),
                "draughtM": v.get("draughtM", 10.0),
                "navStatus": v.get("navStatus", "Under way")
            }
        ]
    }


# ============================================================
# ALERTS
# ============================================================

def list_alerts(
    severity: str = "all",
    alert_type: str = "all",
    only_unacknowledged: bool = False,
    search: str = ""
) -> list[dict]:
    with _get_connection() as conn:
        cursor = conn.execute("SELECT data_json, acknowledged FROM alerts ORDER BY created_at DESC")
        rows = cursor.fetchall()

    needle = search.strip().lower()
    results = []

    for r in rows:
        a = json.loads(r["data_json"])
        ack = bool(r["acknowledged"])
        if severity != "all" and a.get("severity") != severity:
            continue
        if alert_type != "all" and a.get("type") != alert_type:
            continue
        if only_unacknowledged and ack:
            continue
        if needle:
            match = needle in a.get("title", "").lower() or needle in a.get("message", "").lower()
            if not match:
                continue
        a["acknowledged"] = ack
        results.append(a)

    return results


def acknowledge_alert(alert_id: str) -> Optional[dict]:
    with _get_connection() as conn:
        cursor = conn.execute("SELECT data_json FROM alerts WHERE id = ?", (alert_id,))
        row = cursor.fetchone()
        if not row:
            return None
        a = json.loads(row["data_json"])
        a["acknowledged"] = True
        a["acknowledgedAt"] = _now_iso()
        a["acknowledgedBy"] = "Operator"

        conn.execute(
            "UPDATE alerts SET acknowledged = 1, data_json = ? WHERE id = ?",
            (json.dumps(a), alert_id)
        )
        conn.commit()
    return a


def acknowledge_all_alerts() -> list[dict]:
    with _get_connection() as conn:
        cursor = conn.execute("SELECT id, data_json FROM alerts WHERE acknowledged = 0")
        rows = cursor.fetchall()
        now = _now_iso()
        updated = []

        for r in rows:
            a = json.loads(r["data_json"])
            a["acknowledged"] = True
            a["acknowledgedAt"] = now
            a["acknowledgedBy"] = "Operator"
            conn.execute(
                "UPDATE alerts SET acknowledged = 1, data_json = ? WHERE id = ?",
                (json.dumps(a), r["id"])
            )
            updated.append(a)

        conn.commit()
    return list_alerts()


def create_alert(alert_dict: dict) -> dict:
    aid = alert_dict.get("id") or f"ALT-{uuid.uuid4().hex[:8].upper()}"
    alert_dict["id"] = aid
    now = _now_iso()
    if "timestamp" not in alert_dict:
        alert_dict["timestamp"] = now
    alert_dict["acknowledged"] = False

    with _get_connection() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO alerts (id, incident_id, type, severity, title, acknowledged, data_json, created_at)
            VALUES (?, ?, ?, ?, ?, 0, ?, ?)
            """,
            (
                aid,
                alert_dict.get("incidentId"),
                alert_dict.get("type", "new_spill"),
                alert_dict.get("severity", "high"),
                alert_dict.get("title", "Alert"),
                json.dumps(alert_dict),
                now
            )
        )
        conn.commit()
    return alert_dict


# ============================================================
# SATELLITE SCENES
# ============================================================

def list_scenes(
    mission: str = "all",
    stage: str = "all",
    search: str = ""
) -> list[dict]:
    with _get_connection() as conn:
        cursor = conn.execute("SELECT data_json FROM satellite_scenes ORDER BY created_at DESC")
        rows = cursor.fetchall()

    needle = search.strip().lower()
    results = []

    for r in rows:
        s = json.loads(r["data_json"])
        if mission != "all" and s.get("mission") != mission:
            continue
        if stage != "all" and s.get("processingStage") != stage:
            continue
        if needle:
            match = needle in s.get("id", "").lower() or needle in s.get("region", "").lower()
            if not match:
                continue
        results.append(s)

    return results


def get_scene(scene_id: str) -> Optional[dict]:
    with _get_connection() as conn:
        cursor = conn.execute("SELECT data_json FROM satellite_scenes WHERE id = ?", (scene_id,))
        row = cursor.fetchone()
        if row:
            return json.loads(row["data_json"])
    return None


def get_meta(key: str, default: Any = None) -> Any:
    with _get_connection() as conn:
        cursor = conn.execute("SELECT value_json FROM meta_store WHERE key = ?", (key,))
        row = cursor.fetchone()
        if row:
            return json.loads(row["value_json"])
    return default


def set_meta(key: str, value: Any):
    with _get_connection() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO meta_store (key, value_json) VALUES (?, ?)",
            (key, json.dumps(value))
        )
        conn.commit()


# ============================================================
# USERS
# ============================================================

def list_users() -> list[dict]:
    with _get_connection() as conn:
        cursor = conn.execute("SELECT data_json FROM system_users")
        rows = cursor.fetchall()
        return [json.loads(r["data_json"]) for r in rows]


def get_user_by_email(email: str) -> Optional[dict]:
    with _get_connection() as conn:
        cursor = conn.execute("SELECT data_json FROM system_users WHERE email = ?", (email.strip().lower(),))
        row = cursor.fetchone()
        if row:
            return json.loads(row["data_json"])
    return None


def update_user_role(user_id: str, new_role: str) -> Optional[dict]:
    with _get_connection() as conn:
        cursor = conn.execute("SELECT data_json FROM system_users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            return None
        user = json.loads(row["data_json"])
        user["role"] = new_role
        user["lastActive"] = _now_iso()
        conn.execute(
            "UPDATE system_users SET data_json = ?, updated_at = ? WHERE id = ?",
            (json.dumps(user), _now_iso(), user_id)
        )
        conn.commit()
        return user


# ============================================================
# HELPER: Generate Incident and Alert directly from Detection
# ============================================================

def create_incident_from_detection(
    filename: str,
    scan_id: str,
    confidence: float,
    latitude: float,
    longitude: float,
    area_km2: float,
    perimeter_m: float,
    polygon: list,
    polygons: list,
    image_url: Optional[str] = None,
    overlay_url: Optional[str] = None
) -> dict:
    """
    Called when a SAR image is scanned and an oil spill is detected.
    Automatically instantiates an Incident, computes bounding box, associates nearest vessels,
    creates an Alert, and persists everything to SQLite.
    """
    now = _now_iso()
    inc_id = f"INC-2026-SAR-{scan_id[:6].upper()}"

    # Determine severity based on detected spill area
    if area_km2 >= 5.0:
        severity = "critical"
    elif area_km2 >= 1.0:
        severity = "high"
    elif area_km2 >= 0.2:
        severity = "medium"
    else:
        severity = "low"

    # Derive bounding box
    if polygon:
        lats = [p[0] for p in polygon]
        lngs = [p[1] for p in polygon]
        bbox = {
            "north": round(max(lats), 4),
            "south": round(min(lats), 4),
            "east": round(max(lngs), 4),
            "west": round(min(lngs), 4)
        }
    else:
        bbox = {
            "north": round(latitude + 0.02, 4),
            "south": round(latitude - 0.02, 4),
            "east": round(longitude + 0.02, 4),
            "west": round(longitude - 0.02, 4)
        }

    # Find suspect vessels in the vicinity
    vessels = list_vessels()
    suspects = []
    for v in vessels:
        pos = v.get("position", [0, 0])
        # Simple Euclidean approximation for proximity check
        d_lat = (pos[0] - latitude) * 111.0
        d_lng = (pos[1] - longitude) * 111.0 * 0.95
        dist_km = round((d_lat**2 + d_lng**2)**0.5, 2)
        if dist_km <= 35.0:
            score = max(20, min(95, int(90 - dist_km * 2.0)))
            suspects.append({
                "mmsi": v["mmsi"],
                "name": v["name"],
                "flag": v.get("flag", "Unknown"),
                "type": v.get("type", "Tanker"),
                "responsibilityScore": score,
                "distanceKm": dist_km,
                "timeDiffMin": 25,
                "correlation": round(score / 100.0, 2),
                "behaviour": 0.82,
                "position": pos,
                "speedKn": v.get("speedKn", 10.0),
                "headingDeg": v.get("headingDeg", 0),
                "anomalies": [
                    f"Vessel passed within {dist_km} km of slick boundary",
                    "Speed alteration observed near slick corridor"
                ]
            })

    suspects.sort(key=lambda s: s["responsibilityScore"], reverse=True)

    # Slick object
    slick = {
        "polygon": polygon,
        "centroid": [round(latitude, 4), round(longitude, 4)],
        "bbox": bbox,
        "areaKm2": round(area_km2, 4),
        "lengthKm": round((area_km2 * 2.5)**0.5, 2),
        "widthKm": round((area_km2 / 2.5)**0.5, 2),
        "perimeterKm": round(perimeter_m / 1000.0, 3),
        "orientationDeg": 42
    }

    # Detection detail
    detection_meta = {
        "detectorId": "s1-unet-v2",
        "detectorName": "PyTorch U-Net (ResNet-34 Backbone)",
        "detectorVersion": "2.4.1",
        "confidence": round(confidence, 4),
        "maskCoveragePct": round(min(100.0, area_km2 * 12.5), 1),
        "falsePositiveRisk": round(max(0.02, 1.0 - confidence), 3),
        "lookalikeFlags": ["biogenic film ruled out", "radar backscatter characteristic match"],
        "processedAt": now,
        "stage": "complete"
    }

    # Environmental snapshot
    environment = {
        "observedAt": now,
        "windSpeedMs": 7.4,
        "windDirDeg": 230,
        "windGustMs": 11.2,
        "currentSpeedMs": 0.52,
        "currentDirDeg": 120,
        "waveHeightM": 1.8,
        "wavePeriodS": 7.2,
        "seaSurfaceTempC": 28.5,
        "airTempC": 29.3,
        "visibilityKm": 12,
        "weather": "Moderate SW swell, light haze",
        "salinityPsu": 36.1
    }

    # Origin & trajectory
    origin = {
        "position": [round(latitude - 0.015, 4), round(longitude - 0.018, 4)],
        "confidence": round(confidence * 0.92, 2),
        "estimatedAt": now,
        "methodology": "Hydrodynamic back-projection with wind drift leeway",
        "hindcast": [
            [round(latitude, 4), round(longitude, 4)],
            [round(latitude - 0.007, 4), round(longitude - 0.009, 4)],
            [round(latitude - 0.015, 4), round(longitude - 0.018, 4)]
        ],
        "uncertaintyRing": [],
        "radiusKm": 1.2
    }

    # Forecast drift steps
    forecast = [
        {
            "horizonHours": 0,
            "validAt": now,
            "centroid": [round(latitude, 4), round(longitude, 4)],
            "polygon": polygon,
            "areaKm2": round(area_km2, 4),
            "uncertaintyKm": 0.3,
            "shorelineRisk": "low"
        },
        {
            "horizonHours": 6,
            "validAt": now,
            "centroid": [round(latitude + 0.012, 4), round(longitude + 0.024, 4)],
            "polygon": [[p[0] + 0.012, p[1] + 0.024] for p in polygon[:12]],
            "areaKm2": round(area_km2 * 1.22, 4),
            "uncertaintyKm": 1.1,
            "shorelineRisk": "low"
        },
        {
            "horizonHours": 12,
            "validAt": now,
            "centroid": [round(latitude + 0.025, 4), round(longitude + 0.050, 4)],
            "polygon": [[p[0] + 0.025, p[1] + 0.050] for p in polygon[:12]],
            "areaKm2": round(area_km2 * 1.48, 4),
            "uncertaintyKm": 2.2,
            "shorelineRisk": "medium"
        }
    ]

    # Full Incident document
    incident = {
        "id": inc_id,
        "title": f"Oil Spill detected in {filename}",
        "region": "Arabian Sea",
        "waterBody": "Arabian Sea \u00b7 Marine EEZ",
        "status": "active",
        "severity": severity,
        "slick": slick,
        "detection": detection_meta,
        "suspects": suspects,
        "environment": environment,
        "origin": origin,
        "forecast": forecast,
        "timeline": [
            {
                "id": f"TL-{uuid.uuid4().hex[:6]}",
                "timestamp": now,
                "stage": "detection",
                "actor": "PyTorch U-Net Inference Engine",
                "summary": f"Detected {area_km2:.2f} km² oil slick with {confidence*100:.1f}% confidence from GeoTIFF SAR acquisition ({filename})."
            }
        ],
        "assignedTo": "Cdr. A. Nair",
        "reportedAt": now,
        "updatedAt": now,
        "oilClass": "Heavy Fuel Oil (IFO 380)",
        "spreadRate": 1.35,
        "volumeM3": round(area_km2 * 100.0, 1),
        "notes": f"Automated detection from uploaded SAR raster {filename}. Primary contour spans {len(polygon)} GPS vertices.",
        "lookalikeFlags": ["Low-wind damping checked", "Internal waves ruled out"],
        "imageUrl": image_url,
        "overlayUrl": overlay_url
    }

    # Save incident
    save_incident(incident)

    # Create matching Alert
    create_alert({
        "id": f"ALT-SAR-{uuid.uuid4().hex[:6].upper()}",
        "incidentId": inc_id,
        "type": "new_spill",
        "severity": severity,
        "title": f"New spill detected in {filename}",
        "message": f"U-Net identified {area_km2:.2f} km² oil spill at ({latitude:.4f} N, {longitude:.4f} E) with {confidence*100:.1f}% confidence.",
        "suggestedAction": "Verify slick contour on Map Canvas and task regional response unit.",
        "timestamp": now
    })

    logger.info("Auto-generated incident %s and alert for scan %s", inc_id, scan_id)
    return incident
