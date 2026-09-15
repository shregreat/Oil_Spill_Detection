from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ============================================================
# DETECTION RESPONSE
# ============================================================

class DetectionResult(BaseModel):
    """Single detection result (one spill region)."""

    id: Optional[str] = None
    scan_id: Optional[str] = None
    confidence: float = 0.0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area_m2: float = 0.0
    area_km2: float = 0.0
    perimeter_m: float = 0.0
    num_regions: int = 0
    threshold: float = 0.4
    polygon: list = Field(default_factory=list)
    polygons: list = Field(default_factory=list)
    created_at: Optional[str] = None


# ============================================================
# SCAN RESPONSE
# ============================================================

class ScanResponse(BaseModel):
    """Response for a single scan."""

    id: str
    filename: str
    image_url: Optional[str] = None
    overlay_url: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    detected: bool = False
    scan_date: Optional[str] = None
    created_at: Optional[str] = None
    detections: list[DetectionResult] = Field(
        default_factory=list
    )


# ============================================================
# PREDICT RESPONSE
# ============================================================

class PredictResponse(BaseModel):
    """Response returned by the /detect endpoint."""

    success: bool = True
    scan_id: Optional[str] = None
    filename: str
    detected: bool = False
    confidence: float = 0.0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area_m2: float = 0.0
    area_km2: float = 0.0
    perimeter_m: float = 0.0
    polygon: list = Field(default_factory=list)
    polygons: list = Field(default_factory=list)
    num_regions: int = 0
    threshold: float = 0.4
    image_url: Optional[str] = None
    overlay_url: Optional[str] = None
    overlay_base64: Optional[str] = None
    message: str = ""


# ============================================================
# SCAN LIST RESPONSE
# ============================================================

class ScanListResponse(BaseModel):
    """Paginated list of scans."""

    scans: list[ScanResponse] = Field(
        default_factory=list
    )
    total: int = 0
    limit: int = 50
    offset: int = 0


# ============================================================
# STATS RESPONSE
# ============================================================

class StatsResponse(BaseModel):
    """Dashboard statistics."""

    total_scans: int = 0
    total_detected: int = 0
    total_clean: int = 0
    total_detections: int = 0
    total_area_km2: float = 0.0
    detection_rate: float = 0.0


# ============================================================
# HEALTH RESPONSE
# ============================================================

class SampleScene(BaseModel):
    """Available sample radar scene for quick testing."""

    filename: str
    size_mb: float
    width: Optional[int] = None
    height: Optional[int] = None
    crs: Optional[str] = None
    region: str = "Offshore Marine Zone"
    description: str = "Sentinel-1 SAR C-band GeoTIFF"


class SampleListResponse(BaseModel):
    """List of sample scenes available on server."""

    samples: list[SampleScene] = Field(default_factory=list)
    total: int = 0


# ============================================================
# HEALTH RESPONSE
# ============================================================

class HealthResponse(BaseModel):
    """Health check response."""

    status: str = "healthy"
    model_loaded: bool = False
    supabase_connected: bool = False
    device: str = "cpu"
    version: str = "1.0.0"
    model_name: str = "U-Net (ResNet-like DoubleConv)"
    threshold: float = 0.4
    min_area_pixels: int = 100


# ============================================================
# DELETE RESPONSE
# ============================================================

class DeleteResponse(BaseModel):
    """Response for deletion requests."""

    success: bool = True
    message: str = ""


# ============================================================
# ERROR RESPONSE
# ============================================================

class ErrorResponse(BaseModel):
    """Standard error response."""

    success: bool = False
    error: str = ""
    detail: Optional[str] = None
