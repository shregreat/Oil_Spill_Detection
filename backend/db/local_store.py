"""
Local SQLite storage fallback for oil spill scans and detections.
Used when Supabase credentials are not configured, providing full offline capability.
"""

import os
import json
import sqlite3
import uuid
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from backend.config import BACKEND_DIR

logger = logging.getLogger(__name__)

DB_PATH = BACKEND_DIR / "db" / "local_scans.sqlite"


def _get_connection() -> sqlite3.Connection:
    """Connect to SQLite and ensure tables exist."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_local_db():
    """Create local SQLite tables if they do not exist."""
    with _get_connection() as conn:
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
        conn.commit()


# Initialize on import
init_local_db()


def create_scan(
    filename: str,
    width: int,
    height: int,
    detected: bool,
    image_url: Optional[str] = None,
    overlay_url: Optional[str] = None
) -> dict:
    """Insert a new scan record into SQLite."""
    scan_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    with _get_connection() as conn:
        conn.execute(
            """
            INSERT INTO scans (id, filename, width, height, detected, image_url, overlay_url, scan_date, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (scan_id, filename, width, height, int(detected), image_url, overlay_url, now, now)
        )
        conn.commit()

    logger.info("Local store created scan: %s (%s)", scan_id, filename)
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
    """Insert a detection record for a scan."""
    det_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

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
    """List scans ordered by scan_date desc."""
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
    """Count total scans."""
    with _get_connection() as conn:
        cursor = conn.execute("SELECT COUNT(*) FROM scans")
        return cursor.fetchone()[0]


def get_scan(scan_id: str) -> Optional[dict]:
    """Get a single scan by ID."""
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
    """Get detections for a scan."""
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
    """Delete a scan and associated detections."""
    with _get_connection() as conn:
        conn.execute("DELETE FROM detections WHERE scan_id = ?", (scan_id,))
        cursor = conn.execute("DELETE FROM scans WHERE id = ?", (scan_id,))
        conn.commit()
        return cursor.rowcount > 0


def get_stats() -> dict:
    """Aggregate statistics."""
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
