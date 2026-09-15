import os
import tempfile
import logging
from pathlib import Path
from typing import Optional

import numpy as np
import rasterio
from fastapi import APIRouter, File, UploadFile, HTTPException, Query

from backend.config import THRESHOLD, MAX_UPLOAD_SIZE, SAMPLES_DIR
from backend.models.schemas import PredictResponse, SampleScene, SampleListResponse
from backend.services.prediction import (
    predict_full_image,
    clean_prediction
)
from backend.services.geometry import extract_geometry
from backend.services.visualization import create_overlay_png
from backend.db import supabase_client, local_store


logger = logging.getLogger(__name__)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(tags=["Detection"])


def _get_store():
    """Return supabase_client if configured, otherwise local_store fallback."""
    if supabase_client.is_supabase_configured():
        return supabase_client
    return local_store


def _process_sar_image(
    image: np.ndarray,
    image_transform,
    image_crs,
    filename: str,
    img_width: int,
    img_height: int,
    raw_content: Optional[bytes] = None
) -> PredictResponse:
    """
    Common pipeline: predict, clean, overlay, vectorize, and persist scan.
    """
    # --------------------------------------------------------
    # Run prediction
    # --------------------------------------------------------
    probability = predict_full_image(image)

    # Threshold
    raw_prediction = (probability >= THRESHOLD).astype(np.uint8)

    # Post-processing (noise/border filtering)
    final_mask = clean_prediction(raw_prediction)

    # --------------------------------------------------------
    # Generate Web-friendly PNG Overlay
    # --------------------------------------------------------
    try:
        overlay_bytes, overlay_base64 = create_overlay_png(
            image,
            final_mask
        )
    except Exception as err:
        logger.warning("Overlay generation failed: %s", err)
        overlay_bytes = None
        overlay_base64 = None

    # --------------------------------------------------------
    # Check detection
    # --------------------------------------------------------
    spill_pixels = int(np.sum(final_mask == 1))
    store = _get_store()
    scan_id = None
    image_url = None
    overlay_url = None

    # ----- No spill detected -----
    if spill_pixels == 0:
        if supabase_client.is_supabase_configured():
            if raw_content:
                image_url = supabase_client.upload_file(raw_content, filename)
            if overlay_bytes:
                base_name, _ = os.path.splitext(filename)
                overlay_url = supabase_client.upload_file(overlay_bytes, f"{base_name}_overlay.png")

        scan_record = store.create_scan(
            filename=filename,
            width=img_width,
            height=img_height,
            detected=False,
            image_url=image_url,
            overlay_url=overlay_url or overlay_base64
        )
        scan_id = scan_record.get("id")

        return PredictResponse(
            success=True,
            scan_id=scan_id,
            filename=filename,
            detected=False,
            confidence=0.0,
            threshold=THRESHOLD,
            image_url=image_url,
            overlay_url=overlay_url or overlay_base64,
            overlay_base64=overlay_base64,
            message="No oil spill detected"
        )

    # ----- Spill detected -----
    geometry = extract_geometry(
        final_mask,
        probability,
        image_transform,
        image_crs
    )

    if supabase_client.is_supabase_configured():
        if raw_content:
            image_url = supabase_client.upload_file(raw_content, filename)
        if overlay_bytes:
            base_name, _ = os.path.splitext(filename)
            overlay_url = supabase_client.upload_file(overlay_bytes, f"{base_name}_overlay.png")

    scan_record = store.create_scan(
        filename=filename,
        width=img_width,
        height=img_height,
        detected=True,
        image_url=image_url,
        overlay_url=overlay_url or overlay_base64
    )
    scan_id = scan_record.get("id")

    store.create_detection(
        scan_id=scan_id,
        confidence=round(geometry["confidence"], 4),
        latitude=round(geometry["latitude"], 6) if geometry["latitude"] is not None else None,
        longitude=round(geometry["longitude"], 6) if geometry["longitude"] is not None else None,
        area_m2=round(geometry["area_m2"], 2),
        area_km2=round(geometry["area_km2"], 4),
        perimeter_m=round(geometry["perimeter_m"], 2),
        num_regions=geometry["num_regions"],
        threshold=THRESHOLD,
        polygon=geometry["polygon"],
        polygons=geometry["polygons"]
    )

    # Automatically generate Incident and Alert in system
    try:
        lat = geometry["latitude"] if geometry["latitude"] is not None else 19.42
        lng = geometry["longitude"] if geometry["longitude"] is not None else 71.60
        inc = local_store.create_incident_from_detection(
            filename=filename,
            scan_id=scan_id,
            confidence=geometry["confidence"],
            latitude=lat,
            longitude=lng,
            area_km2=geometry["area_km2"],
            perimeter_m=geometry["perimeter_m"],
            polygon=geometry["polygon"],
            polygons=geometry["polygons"],
            image_url=image_url,
            overlay_url=overlay_url or overlay_base64
        )
        try:
            import asyncio
            from backend.routes.websocket import broadcast_event
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(broadcast_event({
                    "type": "incident_updated",
                    "payload": inc
                }))
        except Exception:
            pass
    except Exception as e:
        logger.warning("Could not auto-generate incident for scan %s: %s", scan_id, e)


    return PredictResponse(
        success=True,
        scan_id=scan_id,
        filename=filename,
        detected=True,
        confidence=round(geometry["confidence"], 4),
        latitude=round(geometry["latitude"], 6) if geometry["latitude"] is not None else None,
        longitude=round(geometry["longitude"], 6) if geometry["longitude"] is not None else None,
        area_m2=round(geometry["area_m2"], 2),
        area_km2=round(geometry["area_km2"], 4),
        perimeter_m=round(geometry["perimeter_m"], 2),
        polygon=geometry["polygon"],
        polygons=geometry["polygons"],
        num_regions=geometry["num_regions"],
        threshold=THRESHOLD,
        image_url=image_url,
        overlay_url=overlay_url,
        overlay_base64=overlay_base64,
        message="Oil spill detected"
    )


# ============================================================
# GET /samples
# ============================================================

@router.get(
    "/samples",
    response_model=SampleListResponse,
    summary="List available sample SAR radar images"
)
def list_samples():
    """
    List sample Sentinel-1 SAR scenes stored on the server
    for quick demonstration and testing without uploading.
    """
    samples = []
    if SAMPLES_DIR.exists() and SAMPLES_DIR.is_dir():
        for file_path in sorted(SAMPLES_DIR.iterdir()):
            if file_path.suffix.lower() in (".tif", ".tiff"):
                size_mb = round(file_path.stat().st_size / (1024 * 1024), 2)
                width = None
                height = None
                crs_str = None
                try:
                    with rasterio.open(file_path) as src:
                        width = src.width
                        height = src.height
                        crs_str = str(src.crs) if src.crs else None
                except Exception:
                    pass

                samples.append(
                    SampleScene(
                        filename=file_path.name,
                        size_mb=size_mb,
                        width=width,
                        height=height,
                        crs=crs_str,
                        region="Gulf / Marine Sentinel-1 Corridor",
                        description=f"SAR Image ({width}x{height})" if width else "SAR GeoTIFF"
                    )
                )

    return SampleListResponse(samples=samples, total=len(samples))


# ============================================================
# POST /detect/sample
# ============================================================

@router.post(
    "/detect/sample",
    response_model=PredictResponse,
    summary="Run detection on a sample SAR image by filename"
)
async def detect_sample_scene(
    filename: str = Query(..., description="Filename of sample image (e.g. 20200224_b.tif)")
):
    """
    Run detection directly on a pre-existing sample scene on the server.
    Avoids client having to re-upload large 20-50MB TIFF files.
    """
    # Prevent path traversal
    safe_name = os.path.basename(filename)
    target_path = SAMPLES_DIR / safe_name

    if not target_path.exists() or not target_path.is_file():
        raise HTTPException(
            status_code=404,
            detail=f"Sample scene '{safe_name}' not found on server."
        )

    try:
        with rasterio.open(target_path) as src:
            image = src.read(1)
            image_transform = src.transform
            image_crs = src.crs
            img_width = src.width
            img_height = src.height

        return _process_sar_image(
            image=image,
            image_transform=image_transform,
            image_crs=image_crs,
            filename=safe_name,
            img_width=img_width,
            img_height=img_height,
            raw_content=None
        )

    except Exception as e:
        logger.exception("Sample detection failed: %s", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Sample detection failed: {str(e)}"
        )


# ============================================================
# POST /detect
# ============================================================

@router.post(
    "/detect",
    response_model=PredictResponse,
    summary="Detect oil spills in a SAR image"
)
async def detect_oil_spill(
    file: UploadFile = File(...)
):
    """
    Upload a GeoTIFF SAR image to run oil spill detection.

    - Runs U-Net sliding-window prediction
    - Post-processes the mask (removes noise/border artifacts)
    - Extracts geometry (area, perimeter, polygon, lat/lon)
    - Stores results in Supabase or local store
    - Returns detection results as JSON with base64 PNG overlay
    """
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file provided"
        )

    filename = file.filename.lower()
    if not (filename.endswith(".tif") or filename.endswith(".tiff")):
        raise HTTPException(
            status_code=400,
            detail="Only .tif or .tiff files are supported"
        )

    temp_path = None
    try:
        content = await file.read()
        if len(content) > MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE // (1024*1024)} MB"
            )

        suffix = ".tif" if filename.endswith(".tif") else ".tiff"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_path = temp_file.name
            temp_file.write(content)

        with rasterio.open(temp_path) as src:
            image = src.read(1)
            image_transform = src.transform
            image_crs = src.crs
            img_width = src.width
            img_height = src.height

        return _process_sar_image(
            image=image,
            image_transform=image_transform,
            image_crs=image_crs,
            filename=file.filename,
            img_width=img_width,
            img_height=img_height,
            raw_content=content
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Detection failed: %s", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Detection failed: {str(e)}"
        )
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass
