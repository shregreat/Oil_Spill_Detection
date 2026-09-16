import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

try:
    from supabase import create_client, Client
    HAS_SUPABASE_LIB = True
except (ImportError, AttributeError):
    create_client = None
    Client = None
    HAS_SUPABASE_LIB = False

from backend.config import SUPABASE_URL, SUPABASE_KEY, SUPABASE_BUCKET


logger = logging.getLogger(__name__)


# ============================================================
# SUPABASE CLIENT (SINGLETON)
# ============================================================

_client: Optional[Client] = None


def get_supabase() -> Client:
    """Get or create the Supabase client."""

    global _client

    if _client is not None:
        return _client

    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_KEY must be set in .env"
        )

    _client = create_client(
        SUPABASE_URL,
        SUPABASE_KEY
    )

    logger.info("Supabase client initialized")

    return _client


def is_supabase_configured() -> bool:
    """Check if Supabase library is installed and credentials are provided."""

    return bool(HAS_SUPABASE_LIB and SUPABASE_URL and SUPABASE_KEY)


# ============================================================
# SCANS - CRUD
# ============================================================

def create_scan(
    filename: str,
    width: int,
    height: int,
    detected: bool,
    image_url: Optional[str] = None,
    overlay_url: Optional[str] = None
) -> dict:
    """Insert a new scan record and return it."""

    client = get_supabase()

    data = {
        "filename": filename,
        "width": width,
        "height": height,
        "detected": detected,
        "image_url": image_url,
        "overlay_url": overlay_url,
        "scan_date": datetime.now(timezone.utc).isoformat()
    }

    response = (
        client.table("scans")
        .insert(data)
        .execute()
    )

    record = response.data[0]

    logger.info(
        "Created scan: %s (%s)",
        record["id"],
        filename
    )

    return record


def get_scan(scan_id: str) -> Optional[dict]:
    """Get a single scan by ID."""

    client = get_supabase()

    response = (
        client.table("scans")
        .select("*")
        .eq("id", scan_id)
        .execute()
    )

    if response.data:
        return response.data[0]

    return None


def list_scans(
    limit: int = 50,
    offset: int = 0
) -> list[dict]:
    """List scans ordered by scan_date descending."""

    client = get_supabase()

    response = (
        client.table("scans")
        .select("*")
        .order("scan_date", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    return response.data


def delete_scan(scan_id: str) -> bool:
    """Delete a scan (cascade deletes detections)."""

    client = get_supabase()

    response = (
        client.table("scans")
        .delete()
        .eq("id", scan_id)
        .execute()
    )

    deleted = len(response.data) > 0

    if deleted:
        logger.info("Deleted scan: %s", scan_id)

    return deleted


def count_scans() -> int:
    """Count total number of scans."""

    client = get_supabase()

    response = (
        client.table("scans")
        .select("id", count="exact")
        .execute()
    )

    return response.count or 0


# ============================================================
# DETECTIONS - CRUD
# ============================================================

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

    client = get_supabase()

    data = {
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
        "polygons": polygons
    }

    response = (
        client.table("detections")
        .insert(data)
        .execute()
    )

    record = response.data[0]

    logger.info(
        "Created detection: %s (scan: %s)",
        record["id"],
        scan_id
    )

    return record


def get_detections_for_scan(
    scan_id: str
) -> list[dict]:
    """Get all detections for a given scan."""

    client = get_supabase()

    response = (
        client.table("detections")
        .select("*")
        .eq("scan_id", scan_id)
        .execute()
    )

    return response.data


# ============================================================
# STATISTICS
# ============================================================

def get_stats() -> dict:
    """Get aggregate statistics for the dashboard."""

    client = get_supabase()

    # Total scans
    scans_response = (
        client.table("scans")
        .select("id", count="exact")
        .execute()
    )

    total_scans = scans_response.count or 0

    # Scans with detections
    detected_response = (
        client.table("scans")
        .select("id", count="exact")
        .eq("detected", True)
        .execute()
    )

    total_detected = detected_response.count or 0

    # Total detections
    detections_response = (
        client.table("detections")
        .select("id", count="exact")
        .execute()
    )

    total_detections = detections_response.count or 0

    # Sum of spill areas
    area_response = (
        client.table("detections")
        .select("area_km2")
        .execute()
    )

    total_area_km2 = sum(
        d["area_km2"]
        for d in area_response.data
    )

    return {
        "total_scans": total_scans,
        "total_detected": total_detected,
        "total_clean": total_scans - total_detected,
        "total_detections": total_detections,
        "total_area_km2": round(total_area_km2, 4),
        "detection_rate": round(
            (total_detected / total_scans * 100)
            if total_scans > 0
            else 0.0,
            2
        )
    }


# ============================================================
# STORAGE
# ============================================================

def upload_file(
    file_bytes: bytes,
    filename: str
) -> Optional[str]:
    """
    Upload a file to Supabase Storage.
    Returns the public URL or None on failure.
    """

    client = get_supabase()

    # Generate unique path
    unique_name = f"{uuid.uuid4().hex}_{filename}"

    try:

        client.storage.from_(
            SUPABASE_BUCKET
        ).upload(
            path=unique_name,
            file=file_bytes,
            file_options={
                "content-type": "image/tiff"
            }
        )

        # Get public URL
        public_url = client.storage.from_(
            SUPABASE_BUCKET
        ).get_public_url(unique_name)

        logger.info(
            "Uploaded file: %s",
            unique_name
        )

        return public_url

    except Exception as e:

        logger.error(
            "Storage upload failed: %s",
            str(e)
        )

        return None
