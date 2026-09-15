import torch
import numpy as np
import cv2
import rasterio
from rasterio.warp import transform

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

print(
    "Validation samples:",
    len(dataset)
)

print()


# ============================================================
# GET SAMPLE
# ============================================================

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

print("Sample:", SAMPLE_INDEX)
print("TIFF:", filename)
print("Patch coordinate:", x, y)

print()


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
# SPILL PIXELS
# ============================================================

spill_pixels = np.argwhere(
    mask_np > 0
)

print(
    "Predicted spill pixels:",
    len(spill_pixels)
)

print()


# ============================================================
# DETECTION
# ============================================================

if len(spill_pixels) == 0:

    print("Oil Spill Detected: NO ❌")

else:

    print("Oil Spill Detected: YES ✅")


    # ========================================================
    # REAL AREA
    # ========================================================

    # Sentinel-1 pixel spacing from metadata:
    # approximately 10 m x 10 m

    PIXEL_SIZE_METERS = 10.0

    area_m2 = (
        len(spill_pixels)
        * PIXEL_SIZE_METERS
        * PIXEL_SIZE_METERS
    )

    area_km2 = (
        area_m2 / 1_000_000
    )


    # ========================================================
    # FIND CONTOURS
    # ========================================================

    mask_uint8 = (
        mask_np * 255
    ).astype(
        np.uint8
    )

    contours, _ = cv2.findContours(
        mask_uint8,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )


    if len(contours) == 0:

        print(
            "No spill contour found."
        )

    else:

        # Largest connected spill region
        largest_contour = max(
            contours,
            key=cv2.contourArea
        )


        # ====================================================
        # CONTOUR AREA
        # ====================================================

        contour_area_pixels = (
            cv2.contourArea(
                largest_contour
            )
        )


        # ====================================================
        # PERIMETER
        # ====================================================

        perimeter_pixels = (
            cv2.arcLength(
                largest_contour,
                True
            )
        )


        perimeter_m = (
            perimeter_pixels
            * PIXEL_SIZE_METERS
        )


        # ====================================================
        # BOUNDING BOX
        # ====================================================

        bx, by, width, height = (
            cv2.boundingRect(
                largest_contour
            )
        )


        # ====================================================
        # CENTROID
        # ====================================================

        moments = cv2.moments(
            largest_contour
        )

        if moments["m00"] != 0:

            centroid_local_x = (
                moments["m10"]
                / moments["m00"]
            )

            centroid_local_y = (
                moments["m01"]
                / moments["m00"]
            )

        else:

            centroid_local_x = 0
            centroid_local_y = 0


        # ====================================================
        # ORIGINAL IMAGE PIXEL
        # ====================================================

        original_pixel_x = (
            x - 256
            + centroid_local_x
        )

        original_pixel_y = (
            y - 256
            + centroid_local_y
        )


        # ====================================================
        # GEOREFERENCE
        # ====================================================

        with rasterio.open(
            TIFF_PATH
        ) as src:

            print(
                "CRS:",
                src.crs
            )

            # Pixel -> UTM
            utm_x, utm_y = (
                rasterio.transform.xy(
                    src.transform,
                    original_pixel_y,
                    original_pixel_x,
                    offset="center"
                )
            )


            # UTM -> Latitude / Longitude
            longitude, latitude = transform(
                src.crs,
                "EPSG:4326",
                [utm_x],
                [utm_y]
            )

            latitude = latitude[0]
            longitude = longitude[0]


        # ====================================================
        # CONFIDENCE
        # ====================================================

        spill_probability = (
            probability_np[
                mask_np > 0
            ]
        )

        confidence = float(
            spill_probability.mean()
        )


        # ====================================================
        # RESULTS
        # ====================================================

        print()
        print("======================================")
        print("        OIL SPILL RESULTS")
        print("======================================")

        print()

        print(
            "Oil Spill Detected: YES ✅"
        )

        print(
            "Confidence:",
            round(
                confidence * 100,
                2
            ),
            "%"
        )

        print()

        print(
            "Spill Area:",
            round(
                area_m2,
                2
            ),
            "m²"
        )

        print(
            "Spill Area:",
            round(
                area_km2,
                6
            ),
            "km²"
        )

        print()

        print(
            "Centroid Latitude:",
            round(
                latitude,
                6
            )
        )

        print(
            "Centroid Longitude:",
            round(
                longitude,
                6
            )
        )

        print()

        print(
            "Bounding Box:"
        )

        print(
            "X:",
            bx
        )

        print(
            "Y:",
            by
        )

        print(
            "Width:",
            width,
            "pixels"
        )

        print(
            "Height:",
            height,
            "pixels"
        )

        print()

        print(
            "Perimeter:",
            round(
                perimeter_m,
                2
            ),
            "meters"
        )


        # ====================================================
        # POLYGON
        # ====================================================

        polygon_points = []

        for point in largest_contour:

            local_px = (
                float(point[0][0])
            )

            local_py = (
                float(point[0][1])
            )

            original_px = (
                x - 256 + local_px
            )

            original_py = (
                y - 256 + local_py
            )


            with rasterio.open(
                TIFF_PATH
            ) as src:

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

                polygon_points.append(
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


        # ====================================================
        # PRINT POLYGON
        # ====================================================

        print()

        print("Spill Polygon Points:")

        print(
            "Total points:",
            len(polygon_points)
        )

        print()

        # Print first 10 points
        for point in polygon_points[:10]:

            print(
                point
            )

        if len(polygon_points) > 10:

            print(
                "...",
                len(polygon_points) - 10,
                "more points"
            )


# ============================================================
# COMPLETE
# ============================================================

print()

print("======================================")
print("       GEOMETRY COMPLETED! ✅")
print("======================================")