import numpy as np
import cv2
import logging

from rasterio.warp import transform as rasterio_transform


logger = logging.getLogger(__name__)


# ============================================================
# EXTRACT GEOMETRY FROM PREDICTION MASK
# ============================================================

def extract_geometry(
    mask: np.ndarray,
    probability: np.ndarray,
    geo_transform,
    crs
) -> dict:
    """
    Extract geographic and geometric properties from a
    cleaned prediction mask.

    Args:
        mask:          Binary prediction mask (0/1, uint8)
        probability:   Probability map (0.0-1.0, float32)
        geo_transform: Rasterio affine transform
        crs:           Rasterio CRS object

    Returns:
        Dictionary with latitude, longitude, area, perimeter,
        polygon(s), confidence, and num_regions.
    """

    height, width = mask.shape

    # ---------------------------------------------------------
    # Pixel dimensions (from geo-transform)
    # ---------------------------------------------------------

    pixel_width = abs(geo_transform.a)
    pixel_height = abs(geo_transform.e)
    pixel_area = pixel_width * pixel_height

    # ---------------------------------------------------------
    # Spill area
    # ---------------------------------------------------------

    spill_pixels = int(np.sum(mask == 1))
    area_m2 = spill_pixels * pixel_area
    area_km2 = area_m2 / 1_000_000

    # ---------------------------------------------------------
    # Find contours
    # ---------------------------------------------------------

    contours, _ = cv2.findContours(
        mask,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    polygons = []
    total_perimeter_m = 0.0

    for contour in contours:

        contour_area = cv2.contourArea(contour)

        if contour_area <= 0:
            continue

        # Perimeter
        perimeter_pixels = cv2.arcLength(
            contour, True
        )

        perimeter_m = perimeter_pixels * (
            (pixel_width + pixel_height) / 2
        )

        total_perimeter_m += perimeter_m

        # Simplify polygon
        epsilon = 0.01 * cv2.arcLength(
            contour, True
        )

        simplified = cv2.approxPolyDP(
            contour, epsilon, True
        )

        raw_points = []
        for point in simplified:
            px, py = point[0]
            raw_x = float(geo_transform.c + (px * geo_transform.a))
            raw_y = float(geo_transform.f + (py * geo_transform.e))
            raw_points.append((raw_x, raw_y))

        polygon = []
        if crs is not None and len(raw_points) > 0:
            try:
                xs = [p[0] for p in raw_points]
                ys = [p[1] for p in raw_points]
                lon_list, lat_list = rasterio_transform(
                    crs,
                    "EPSG:4326",
                    xs,
                    ys
                )
                # Store standard Leaflet coordinates [latitude, longitude]
                for lon, lat in zip(lon_list, lat_list):
                    polygon.append([float(lat), float(lon)])
            except Exception as e:
                logger.warning(f"CRS transform failed for contour: {e}")
                # Fallback to [y, x] pixel coordinates
                polygon = [[p[1], p[0]] for p in raw_points]
        else:
            # Fallback to [y, x] pixel coordinates
            polygon = [[p[1], p[0]] for p in raw_points]

        if len(polygon) >= 3:
            polygons.append(polygon)

    # ---------------------------------------------------------
    # Centroid of ALL detected pixels
    # ---------------------------------------------------------

    ys, xs = np.where(mask == 1)

    if len(xs) > 0:

        centroid_x = float(np.mean(xs))
        centroid_y = float(np.mean(ys))
        raw_cx = float(geo_transform.c + (centroid_x * geo_transform.a))
        raw_cy = float(geo_transform.f + (centroid_y * geo_transform.e))

        if crs is not None:
            try:
                lon_list, lat_list = rasterio_transform(
                    crs,
                    "EPSG:4326",
                    [raw_cx],
                    [raw_cy]
                )
                longitude = float(lon_list[0])
                latitude = float(lat_list[0])
            except Exception as e:
                logger.warning(f"CRS transform failed for centroid: {e}")
                longitude = raw_cx
                latitude = raw_cy
        else:
            longitude = raw_cx
            latitude = raw_cy

    else:

        latitude = None
        longitude = None

    # ---------------------------------------------------------
    # Confidence (mean probability over spill pixels)
    # ---------------------------------------------------------

    selected = probability[mask == 1]

    confidence = (
        float(np.mean(selected))
        if len(selected) > 0
        else 0.0
    )

    # ---------------------------------------------------------
    # Backward-compatible single polygon (largest)
    # ---------------------------------------------------------

    if len(polygons) > 0:
        polygon = max(polygons, key=len)
    else:
        polygon = []

    return {
        "latitude": latitude,
        "longitude": longitude,
        "area_m2": float(area_m2),
        "area_km2": float(area_km2),
        "perimeter_m": float(total_perimeter_m),
        "polygon": polygon,
        "polygons": polygons,
        "num_regions": len(polygons),
        "confidence": confidence
    }
