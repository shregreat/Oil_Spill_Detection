import os
import tempfile

import cv2
import numpy as np
import rasterio
import torch

from fastapi import FastAPI, File, UploadFile, HTTPException
from rasterio.warp import transform
from unet import UNet


# ============================================================
# CONFIGURATION
# ============================================================

MODEL_PATH = "best_oil_spill_unet.pth"

PATCH_SIZE = 256
STRIDE = 128

# Final tested threshold
THRESHOLD = 0.4

# Remove very small noisy regions
MIN_AREA_PIXELS = 100


# ============================================================
# DEVICE
# ============================================================

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

print("Using device:", device)


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="Oil Spill Detection API",
    description="Satellite SAR based oil spill detection and geometry extraction",
    version="4.0.0"
)


# ============================================================
# LOAD MODEL
# ============================================================

print("\nLoading U-Net model...")

model = UNet().to(device)

checkpoint = torch.load(
    MODEL_PATH,
    map_location=device
)

model.load_state_dict(checkpoint)

model.eval()

print("Model loaded successfully ✅")


# ============================================================
# NORMALIZATION
# ============================================================

def normalize_patch(patch):

    patch = patch.astype(np.float32)

    mean = patch.mean()
    std = patch.std()

    if np.isfinite(std) and std > 0:
        patch = (patch - mean) / std
    else:
        patch = patch - mean

    patch = np.nan_to_num(
        patch,
        nan=0.0,
        posinf=0.0,
        neginf=0.0
    )

    return patch


# ============================================================
# FULL IMAGE PREDICTION
# ============================================================

def predict_full_image(image):

    height, width = image.shape

    probability = np.zeros(
        (height, width),
        dtype=np.float32
    )

    count = np.zeros(
        (height, width),
        dtype=np.float32
    )

    with torch.no_grad():

        for y in range(
            0,
            height,
            STRIDE
        ):

            for x in range(
                0,
                width,
                STRIDE
            ):

                y2 = min(
                    y + PATCH_SIZE,
                    height
                )

                x2 = min(
                    x + PATCH_SIZE,
                    width
                )

                patch = image[
                    y:y2,
                    x:x2
                ]

                h, w = patch.shape

                # --------------------------------
                # Padding
                # --------------------------------

                padded = np.zeros(
                    (PATCH_SIZE, PATCH_SIZE),
                    dtype=np.float32
                )

                padded[
                    :h,
                    :w
                ] = patch

                # --------------------------------
                # Normalize
                # --------------------------------

                padded = normalize_patch(
                    padded
                )

                # --------------------------------
                # Convert to tensor
                # --------------------------------

                tensor = torch.from_numpy(
                    padded
                ).unsqueeze(0).unsqueeze(0)

                tensor = tensor.to(device)

                # --------------------------------
                # Model prediction
                # --------------------------------

                output = model(
                    tensor
                )

                pred = torch.sigmoid(
                    output
                )

                pred = (
                    pred
                    .squeeze()
                    .cpu()
                    .numpy()
                )

                # Remove padding
                pred = pred[
                    :h,
                    :w
                ]

                # --------------------------------
                # Overlapping predictions
                # --------------------------------

                probability[
                    y:y2,
                    x:x2
                ] += pred

                count[
                    y:y2,
                    x:x2
                ] += 1

    # Average overlapping predictions

    probability = (
        probability /
        np.maximum(count, 1)
    )

    return probability


# ============================================================
# CLEAN PREDICTION
# ============================================================

def clean_prediction(prediction):

    prediction = prediction.astype(
        np.uint8
    )

    num_labels, labels, stats, _ = (
        cv2.connectedComponentsWithStats(
            prediction,
            connectivity=8
        )
    )

    cleaned = np.zeros_like(
        prediction
    )

    height, width = prediction.shape

    for label in range(
        1,
        num_labels
    ):

        x = stats[
            label,
            cv2.CC_STAT_LEFT
        ]

        y = stats[
            label,
            cv2.CC_STAT_TOP
        ]

        w = stats[
            label,
            cv2.CC_STAT_WIDTH
        ]

        h = stats[
            label,
            cv2.CC_STAT_HEIGHT
        ]

        area = stats[
            label,
            cv2.CC_STAT_AREA
        ]

        # --------------------------------
        # Remove small noise
        # --------------------------------

        if area < MIN_AREA_PIXELS:
            continue

        # --------------------------------
        # Remove border artifacts
        # --------------------------------

        touches_border = (
            x == 0
            or y == 0
            or x + w >= width
            or y + h >= height
        )

        if touches_border:
            continue

        # --------------------------------
        # Keep ALL valid regions
        # --------------------------------

        cleaned[
            labels == label
        ] = 1

    return cleaned


# ============================================================
# EXTRACT GEOMETRY
# ============================================================

def extract_geometry(
    mask,
    probability,
    transform_data,
    crs
):

    height, width = mask.shape

    # --------------------------------
    # Pixel dimensions
    # --------------------------------

    pixel_width = abs(
        transform_data.a
    )

    pixel_height = abs(
        transform_data.e
    )

    pixel_area = (
        pixel_width *
        pixel_height
    )

    # --------------------------------
    # Spill area
    # --------------------------------

    spill_pixels = int(
        np.sum(mask == 1)
    )

    area_m2 = (
        spill_pixels *
        pixel_area
    )

    area_km2 = (
        area_m2 /
        1_000_000
    )

    # --------------------------------
    # Contours
    # --------------------------------

    contours, _ = cv2.findContours(
        mask,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    polygons = []

    total_perimeter_m = 0.0

    largest_contour = None
    largest_area = 0

    for contour in contours:

        contour_area_pixels = cv2.contourArea(
            contour
        )

        if contour_area_pixels <= 0:
            continue

        # --------------------------------
        # Perimeter
        # --------------------------------

        perimeter_pixels = cv2.arcLength(
            contour,
            True
        )

        perimeter_m = (
            perimeter_pixels *
            (
                (
                    pixel_width +
                    pixel_height
                ) / 2
            )
        )

        total_perimeter_m += perimeter_m

        # --------------------------------
        # Simplify polygon
        # --------------------------------

        epsilon = (
            0.01 *
            cv2.arcLength(
                contour,
                True
            )
        )

        simplified = cv2.approxPolyDP(
            contour,
            epsilon,
            True
        )

        polygon = []

        for point in simplified:

            px, py = point[0]

            lon_list, lat_list = transform(
                crs,
                "EPSG:4326",
                [float(
                    transform_data.c +
                    (
                        px *
                        transform_data.a
                    )
                )],
                [float(
                    transform_data.f +
                    (
                        py *
                        transform_data.e
                    )
                )]
            )

            polygon.append([
                float(lon_list[0]),
                float(lat_list[0])
            ])

        if len(polygon) >= 3:

            polygons.append(
                polygon
            )

        # --------------------------------
        # Find largest contour
        # --------------------------------

        if contour_area_pixels > largest_area:

            largest_area = contour_area_pixels

            largest_contour = contour

    # --------------------------------
    # Centroid of ALL detected pixels
    # --------------------------------

    ys, xs = np.where(
        mask == 1
    )

    if len(xs) > 0:

        centroid_x = float(
            np.mean(xs)
        )

        centroid_y = float(
            np.mean(ys)
        )

        lon_list, lat_list = transform(
            crs,
            "EPSG:4326",
            [centroid_x],
            [centroid_y]
        )

        longitude = float(
            lon_list[0]
        )

        latitude = float(
            lat_list[0]
        )

    else:

        latitude = None
        longitude = None

    # --------------------------------
    # Confidence
    # --------------------------------

    selected_probabilities = (
        probability[mask == 1]
    )

    if len(
        selected_probabilities
    ) > 0:

        confidence = float(
            np.mean(
                selected_probabilities
            )
        )

    else:

        confidence = 0.0

    # --------------------------------
    # Backward-compatible polygon
    # --------------------------------

    if len(polygons) > 0:

        # Largest polygon first
        polygon = max(
            polygons,
            key=len
        )

    else:

        polygon = []

    return {
        "latitude": latitude,
        "longitude": longitude,
        "area_m2": float(area_m2),
        "area_km2": float(area_km2),
        "perimeter_m": float(
            total_perimeter_m
        ),
        "polygon": polygon,
        "polygons": polygons,
        "num_regions": len(polygons),
        "confidence": confidence
    }


# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/")
def root():

    return {
        "message": "Oil Spill Detection API is running",
        "status": "active",
        "model": "U-Net",
        "device": str(device),
        "threshold": THRESHOLD,
        "stride": STRIDE,
        "version": "4.0.0"
    }


# ============================================================
# HEALTH ENDPOINT
# ============================================================

@app.get("/health")
def health():

    return {
        "status": "healthy",
        "model_loaded": True,
        "device": str(device)
    }


# ============================================================
# PREDICT ENDPOINT
# ============================================================

@app.post("/predict")
async def predict(
    file: UploadFile = File(...)
):

    # --------------------------------
    # Validate file
    # --------------------------------

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="No file provided"
        )

    filename = file.filename.lower()

    if not (
        filename.endswith(".tif")
        or filename.endswith(".tiff")
    ):

        raise HTTPException(
            status_code=400,
            detail="Only .tif or .tiff files are supported"
        )

    temp_path = None

    try:

        # --------------------------------
        # Save uploaded file temporarily
        # --------------------------------

        suffix = (
            ".tif"
            if filename.endswith(".tif")
            else ".tiff"
        )

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix
        ) as temp_file:

            temp_path = temp_file.name

            content = await file.read()

            temp_file.write(
                content
            )

        # --------------------------------
        # Open GeoTIFF
        # --------------------------------

        with rasterio.open(
            temp_path
        ) as src:

            if src.crs is None:

                raise HTTPException(
                    status_code=400,
                    detail="Uploaded TIFF does not contain CRS/georeferencing"
                )

            image = src.read(1)

            image_transform = src.transform

            image_crs = src.crs

        # --------------------------------
        # Full image prediction
        # --------------------------------

        probability = predict_full_image(
            image
        )

        # --------------------------------
        # Threshold
        # --------------------------------

        raw_prediction = (
            probability >= THRESHOLD
        ).astype(np.uint8)

        # --------------------------------
        # Cleanup
        # --------------------------------

        final_mask = clean_prediction(
            raw_prediction
        )

        # --------------------------------
        # Check detection
        # --------------------------------

        spill_pixels = int(
            np.sum(final_mask == 1)
        )

        if spill_pixels == 0:

            return {
                "detected": False,
                "confidence": 0.0,
                "latitude": None,
                "longitude": None,
                "area_m2": 0.0,
                "area_km2": 0.0,
                "perimeter_m": 0.0,
                "polygon": [],
                "polygons": [],
                "num_regions": 0,
                "threshold": THRESHOLD
            }

        # --------------------------------
        # Geometry
        # --------------------------------

        geometry = extract_geometry(
            final_mask,
            probability,
            image_transform,
            image_crs
        )

        # --------------------------------
        # Final response
        # --------------------------------

        response = {
            "detected": True,
            "confidence": round(
                geometry["confidence"],
                4
            ),
            "latitude": round(
                geometry["latitude"],
                6
            ) if geometry["latitude"] is not None else None,
            "longitude": round(
                geometry["longitude"],
                6
            ) if geometry["longitude"] is not None else None,
            "area_m2": round(
                geometry["area_m2"],
                2
            ),
            "area_km2": round(
                geometry["area_km2"],
                4
            ),
            "perimeter_m": round(
                geometry["perimeter_m"],
                2
            ),
            "polygon": geometry["polygon"],
            "polygons": geometry["polygons"],
            "num_regions": geometry["num_regions"],
            "threshold": THRESHOLD
        }

        return response

    except HTTPException:

        raise

    except Exception as e:

        print(
            "Prediction error:",
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )

    finally:

        # --------------------------------
        # Cleanup temporary file
        # --------------------------------

        if (
            temp_path is not None
            and os.path.exists(temp_path)
        ):

            os.remove(
                temp_path
            )