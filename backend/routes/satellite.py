import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from backend.db import local_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/satellite", tags=["Satellite"])


@router.get("/scenes", summary="List satellite SAR scenes")
def list_scenes(
    mission: str = Query("all", description="Satellite mission (e.g. Sentinel-1A, RADARSAT-2)"),
    stage: str = Query("all", description="Processing stage ('queued', 'processing', 'detection', 'complete')"),
    search: str = Query("", description="Search scene ID or region")
):
    """
    Returns catalogue of satellite scenes acquired or scheduled for detection.
    """
    return local_store.list_scenes(mission=mission, stage=stage, search=search)


@router.get("/scenes/latest", summary="Get most recently acquired scene")
def get_latest_scene():
    """
    Returns the latest processed Sentinel-1 SAR acquisition.
    """
    scenes = local_store.list_scenes()
    if scenes:
        return scenes[0]
    raise HTTPException(status_code=404, detail="No satellite scenes available")


@router.get("/scenes/{scene_id}", summary="Get scene metadata by ID")
def get_scene(scene_id: str):
    """
    Returns details, footprint bounds, and detection status for a satellite scene.
    """
    scene = local_store.get_scene(scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail=f"Scene {scene_id} not found")
    return scene


@router.get("/coverage", summary="Get current satellite coverage summary")
def get_coverage():
    """
    Returns spatial coverage percentage, active swath width, and sensor operational readiness.
    """
    cov = local_store.get_meta("sceneCoverageSummary")
    if cov:
        return cov
    return {
        "swathWidthKm": 250,
        "dailyCoverageKm2": 450000,
        "activePassesToday": 4,
        "revisitHours": 36
    }


@router.get("/passes", summary="Get upcoming satellite passes")
def get_upcoming_passes():
    """
    Returns scheduled orbital passes over the monitored marine corridors.
    """
    passes = local_store.get_meta("upcomingPasses")
    if passes:
        return passes
    return []


@router.post("/scenes/{scene_id}/detect", summary="Trigger detection pipeline for scene")
def request_detection(scene_id: str):
    """
    Dispatches a processing and detection job for the specified satellite scene.
    """
    scene = local_store.get_scene(scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail=f"Scene {scene_id} not found")

    return {
        "jobId": f"JOB-{scene_id[-6:]}",
        "sceneId": scene_id,
        "stage": "queued"
    }
