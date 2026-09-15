import torch
import numpy as np
import rasterio

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

# Same sample that we analyzed earlier
SAMPLE_INDEX = 0

THRESHOLD = 0.5

# Original TIFF used by validation sample 0
TIFF_PATH = "Radar_data/train/images/20200307.tif"


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

print("Loading validation dataset...")

dataset = OilSpillDataset(
    CSV_PATH
)

print(
    "Validation samples:",
    len(dataset)
)

print()


# ============================================================
# GET SAMPLE
# ============================================================

image, ground_truth = dataset[SAMPLE_INDEX]

# Get original CSV row information
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

print("Sample:", SAMPLE_INDEX)
print("Image:", filename)
print("Patch coordinate:", x, y)
print()


# ============================================================
# LOAD MODEL
# ============================================================

print("Loading trained U-Net...")

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
# MODEL PREDICTION
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
# CONVERT TO NUMPY
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

print(
    "Predicted spill pixels:",
    len(spill_pixels)
)

print()


# ============================================================
# CHECK DETECTION
# ============================================================

if len(spill_pixels) == 0:

    print("Oil Spill Detected: NO ❌")

else:

    print("Oil Spill Detected: YES ✅")


    # ========================================================
    # PATCH CENTROID
    # ========================================================

    # np.argwhere returns:
    # row = Y
    # col = X

    local_y = spill_pixels[:, 0]
    local_x = spill_pixels[:, 1]

    centroid_local_x = (
        local_x.mean()
    )

    centroid_local_y = (
        local_y.mean()
    )


    # ========================================================
    # CONVERT PATCH PIXEL TO ORIGINAL IMAGE PIXEL
    # ========================================================

    original_pixel_x = (
        x - 256 + centroid_local_x
    )

    original_pixel_y = (
        y - 256 + centroid_local_y
    )


    print(
        "Original image pixel X:",
        round(
            original_pixel_x,
            2
        )
    )

    print(
        "Original image pixel Y:",
        round(
            original_pixel_y,
            2
        )
    )

    print()


    # ========================================================
    # OPEN GEOTIFF
    # ========================================================

    print("Reading GeoTIFF information...")

    with rasterio.open(TIFF_PATH) as src:

        print(
            "CRS:",
            src.crs
        )

        print(
            "Image size:",
            src.width,
            "x",
            src.height
        )


        # ====================================================
        # PIXEL → MAP COORDINATES
        # ====================================================

        map_x, map_y = rasterio.transform.xy(
            src.transform,
            original_pixel_y,
            original_pixel_x,
            offset="center"
        )


        print()

        print(
            "UTM X:",
            round(
                map_x,
                3
            )
        )

        print(
            "UTM Y:",
            round(
                map_y,
                3
            )
        )


        # ====================================================
        # UTM → LATITUDE / LONGITUDE
        # ====================================================

        from rasterio.warp import transform

        longitude, latitude = transform(
            src.crs,
            "EPSG:4326",
            [map_x],
            [map_y]
        )


        latitude = latitude[0]

        longitude = longitude[0]


        print()

        print("======================================")
        print("       SPILL GEOLOCATION")
        print("======================================")

        print()

        print(
            "Latitude:",
            round(
                latitude,
                6
            )
        )

        print(
            "Longitude:",
            round(
                longitude,
                6
            )
        )


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


        print()

        print(
            "Model confidence:",
            round(
                confidence,
                4
            )
        )


# ============================================================
# COMPLETE
# ============================================================

print()

print("======================================")
print("       GEOLOCATION COMPLETED! ✅")
print("======================================")