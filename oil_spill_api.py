import torch
import numpy as np
import cv2
import rasterio
from rasterio.warp import transform
import json

from dataset import OilSpillDataset
from unet import UNet


# ============================================================
# CONFIGURATION
# ============================================================

MODEL_PATH = "best_oil_spill_unet.pth"

CSV_PATH = (
    "Radar_data/train/"
    "dataframe_val_dataset_256_90.csv"
)

SAMPLE_INDEX = 0

THRESHOLD = 0.5


# ============================================================
# DEVICE
# ============================================================

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

print("Using device:", device)

if torch.cuda.is_available():
    print(
        "GPU:",
        torch.cuda.get_device_name(0)
    )

print()


# ============================================================
# LOAD DATASET
# ============================================================

dataset = OilSpillDataset(CSV_PATH)

image, ground_truth = dataset[SAMPLE_INDEX]

row = dataset.rows[SAMPLE_INDEX]

filename = (
    row["paths"]
    .replace("\\", "/")
    .split("/")[-1]
)

x, y = map(
    int,
    row["coordinates"].split(",")
)

TIFF_PATH = (
    "Radar_data/train/images/"
    + filename
)


# ============================================================
# LOAD MODEL
# ============================================================

model = UNet().to(device)

model.load_state_dict(
    torch.load(
        MODEL_PATH,
        map_location=device
    )
)

model.eval()

print("Model loaded successfully! ✅")
print()


# ============================================================
# PREDICTION
# ============================================================

image_input = (
    image
    .unsqueeze(0)
    .to(device)
)

with torch.no_grad():

    output = model(image_input)

    probability = torch.sigmoid(output)

    predicted_mask = (
        probability >= THRESHOLD
    ).float()


# ============================================================
# NUMPY
# ============================================================

mask_np = (
    predicted_mask
    .squeeze()
    .cpu()
    .numpy()
)

probability_np = (
    probability
    .squeeze()
    .cpu()
    .numpy()
)


# ============================================================
# FIND SPILL PIXELS
# ============================================================

spill_pixels = np.argwhere(
    mask_np > 0
)


# ============================================================
# NO SPILL CASE
# ============================================================

if len(spill_pixels) == 0:

    result = {

        "detected": False,

        "confidence": 0.0,

        "latitude": None,

        "longitude": None,

        "area_m2": 0.0,

        "area_km2": 0.0,

        "perimeter_m": 0.0,

        "polygon": []

    }


# ============================================================
# SPILL DETECTED
# ============================================================

else:

    # --------------------------------------------------------
    # PIXEL SIZE
    # --------------------------------------------------------

    PIXEL_SIZE = 10.0


    # --------------------------------------------------------
    # AREA
    # --------------------------------------------------------

    area_m2 = (
        len(spill_pixels)
        * PIXEL_SIZE
        * PIXEL_SIZE
    )

    area_km2 = (
        area_m2 / 1_000_000
    )


    # --------------------------------------------------------
    # MASK
    # --------------------------------------------------------

    mask_uint8 = (
        mask_np * 255
    ).astype(
        np.uint8
    )


    # --------------------------------------------------------
    # CONTOURS
    # --------------------------------------------------------

    contours, _ = cv2.findContours(
        mask_uint8,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )


    largest_contour = max(
        contours,
        key=cv2.contourArea
    )


    # --------------------------------------------------------
    # PERIMETER
    # --------------------------------------------------------

    perimeter_pixels = cv2.arcLength(
        largest_contour,
        True
    )

    perimeter_m = (
        perimeter_pixels
        * PIXEL_SIZE
    )


    # --------------------------------------------------------
    # CENTROID
    # --------------------------------------------------------

    moments = cv2.moments(
        largest_contour
    )

    if moments["m00"] != 0:

        centroid_x = (
            moments["m10"]
            / moments["m00"]
        )

        centroid_y = (
            moments["m01"]
            / moments["m00"]
        )

    else:

        centroid_x = 0

        centroid_y = 0


    # --------------------------------------------------------
    # ORIGINAL IMAGE PIXEL
    # --------------------------------------------------------

    original_x = (
        x - 256
        + centroid_x
    )

    original_y = (
        y - 256
        + centroid_y
    )


    # --------------------------------------------------------
    # GEOREFERENCE
    # --------------------------------------------------------

    polygon = []

    with rasterio.open(
        TIFF_PATH
    ) as src:

        # ----------------------------------------------------
        # CENTROID → UTM
        # ----------------------------------------------------

        utm_x, utm_y = (
            rasterio.transform.xy(
                src.transform,
                original_y,
                original_x,
                offset="center"
            )
        )


        # ----------------------------------------------------
        # UTM → LAT/LON
        # ----------------------------------------------------

        longitude, latitude = transform(
            src.crs,
            "EPSG:4326",
            [utm_x],
            [utm_y]
        )

        latitude = latitude[0]

        longitude = longitude[0]


        # ----------------------------------------------------
        # POLYGON
        # ----------------------------------------------------

        for point in largest_contour:

            local_x = float(
                point[0][0]
            )

            local_y = float(
                point[0][1]
            )


            original_px = (
                x - 256
                + local_x
            )

            original_py = (
                y - 256
                + local_y
            )


            map_x, map_y = (
                rasterio.transform.xy(
                    src.transform,
                    original_py,
                    original_px,
                    offset="center"
                )
            )


            lon, lat = transform(
                src.crs,
                "EPSG:4326",
                [map_x],
                [map_y]
            )


            polygon.append(
                [
                    round(
                        lon[0],
                        6
                    ),
                    round(
                        lat[0],
                        6
                    )
                ]
            )


    # --------------------------------------------------------
    # CONFIDENCE
    # --------------------------------------------------------

    spill_probability = (
        probability_np[
            mask_np > 0
        ]
    )

    confidence = float(
        spill_probability.mean()
    )


    # --------------------------------------------------------
    # FINAL RESULT
    # --------------------------------------------------------

    result = {

        "detected": True,

        "confidence": round(
            confidence,
            4
        ),

        "latitude": round(
            latitude,
            6
        ),

        "longitude": round(
            longitude,
            6
        ),

        "area_m2": round(
            area_m2,
            2
        ),

        "area_km2": round(
            area_km2,
            6
        ),

        "perimeter_m": round(
            perimeter_m,
            2
        ),

        "polygon": polygon

    }


# ============================================================
# PRINT JSON
# ============================================================

print()
print("======================================")
print("       OIL SPILL API OUTPUT")
print("======================================")
print()

print(
    json.dumps(
        result,
        indent=4
    )
)

print()

print("======================================")
print("       API OUTPUT COMPLETED! ✅")
print("======================================")