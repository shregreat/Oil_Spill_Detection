import numpy as np
import matplotlib.pyplot as plt
import torch
import rasterio
import cv2

from unet import UNet


# =========================
# SETTINGS
# =========================

IMAGE_PATH = "Radar_data/train/images/20190816.tif"
MODEL_PATH = "best_oil_spill_unet.pth"

PATCH_SIZE = 256
STRIDE = 128

THRESHOLD = 0.4
MIN_AREA_PIXELS = 100


# =========================
# DEVICE
# =========================

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

print("Device:", device)


# =========================
# LOAD MODEL
# =========================

model = UNet().to(device)

checkpoint = torch.load(
    MODEL_PATH,
    map_location=device
)

model.load_state_dict(checkpoint)
model.eval()

print("Model loaded successfully ✅")


# =========================
# NORMALIZATION
# =========================

def normalize_patch(patch):

    patch = patch.astype(np.float32)

    mean = patch.mean()
    std = patch.std()

    if np.isfinite(std) and std > 0:
        patch = (patch - mean) / std
    else:
        patch = patch - mean

    return np.nan_to_num(
        patch,
        nan=0.0,
        posinf=0.0,
        neginf=0.0
    )


# =========================
# FULL IMAGE PREDICTION
# =========================

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

        for y in range(0, height, STRIDE):

            for x in range(0, width, STRIDE):

                y2 = min(
                    y + PATCH_SIZE,
                    height
                )

                x2 = min(
                    x + PATCH_SIZE,
                    width
                )

                patch = image[y:y2, x:x2]

                h, w = patch.shape

                padded = np.zeros(
                    (PATCH_SIZE, PATCH_SIZE),
                    dtype=np.float32
                )

                padded[:h, :w] = patch

                padded = normalize_patch(
                    padded
                )

                tensor = torch.from_numpy(
                    padded
                ).unsqueeze(0).unsqueeze(0)

                tensor = tensor.to(device)

                output = model(tensor)

                pred = torch.sigmoid(
                    output
                )

                pred = (
                    pred
                    .squeeze()
                    .cpu()
                    .numpy()
                )

                pred = pred[:h, :w]

                probability[
                    y:y2,
                    x:x2
                ] += pred

                count[
                    y:y2,
                    x:x2
                ] += 1

    probability /= np.maximum(
        count,
        1
    )

    return probability


# =========================
# CLEAN ALL VALID REGIONS
# =========================

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

        # Remove tiny noise

        if area < MIN_AREA_PIXELS:
            continue

        # Remove border artifacts

        touches_border = (
            x == 0
            or y == 0
            or x + w >= width
            or y + h >= height
        )

        if touches_border:
            continue

        # Keep ALL valid regions

        cleaned[
            labels == label
        ] = 1

    return cleaned


# =========================
# LOAD IMAGE
# =========================

print("\nLoading image...")

with rasterio.open(
    IMAGE_PATH
) as src:

    image = src.read(1)

    transform = src.transform

    pixel_width = abs(
        transform.a
    )

    pixel_height = abs(
        transform.e
    )

print(
    "Image shape:",
    image.shape
)

print(
    "Pixel size:",
    pixel_width,
    "x",
    pixel_height,
    "meters"
)


# =========================
# PREDICTION
# =========================

print(
    "\nRunning full-image prediction..."
)

probability = predict_full_image(
    image
)

print(
    "Prediction completed ✅"
)


# =========================
# RAW MASK
# =========================

raw_prediction = (
    probability >= THRESHOLD
).astype(np.uint8)


# =========================
# CLEAN MASK
# =========================

print(
    "\nCleaning prediction..."
)

cleaned_prediction = clean_prediction(
    raw_prediction
)

print(
    "Cleaning completed ✅"
)


# =========================
# AREA
# =========================

pixel_area = (
    pixel_width *
    pixel_height
)

spill_pixels = (
    cleaned_prediction == 1
).sum()

area_m2 = (
    spill_pixels *
    pixel_area
)

area_km2 = (
    area_m2 / 1_000_000
)


# =========================
# CONTOURS
# =========================

contours, _ = cv2.findContours(
    cleaned_prediction,
    cv2.RETR_EXTERNAL,
    cv2.CHAIN_APPROX_SIMPLE
)

perimeter_m = 0.0

for contour in contours:

    perimeter_pixels = cv2.arcLength(
        contour,
        True
    )

    perimeter_m += (
        perimeter_pixels *
        ((pixel_width + pixel_height) / 2)
    )


# =========================
# RESULTS
# =========================

print("\n====================================")
print("FINAL SPILL DETECTION")
print("====================================")

print(
    f"Threshold       : {THRESHOLD}"
)

print(
    f"Spill pixels    : {spill_pixels}"
)

print(
    f"Area            : {area_m2:.2f} m²"
)

print(
    f"Area            : {area_km2:.4f} km²"
)

print(
    f"Perimeter       : {perimeter_m:.2f} m"
)

print(
    f"Valid regions   : {len(contours)}"
)

print(
    "===================================="
)


# =========================
# VISUALIZATION
# =========================

plt.figure(
    figsize=(20, 5)
)


# -------------------------
# Original SAR
# -------------------------

plt.subplot(1, 4, 1)

plt.imshow(
    image,
    cmap="gray"
)

plt.title(
    "Original SAR"
)

plt.axis("off")


# -------------------------
# Probability
# -------------------------

plt.subplot(1, 4, 2)

plt.imshow(
    probability,
    cmap="gray",
    vmin=0,
    vmax=1
)

plt.title(
    "Prediction Probability"
)

plt.axis("off")


# -------------------------
# Final Spill Regions
# -------------------------

plt.subplot(1, 4, 3)

plt.imshow(
    cleaned_prediction,
    cmap="gray"
)

plt.title(
    "Final Spill Regions"
)

plt.axis("off")


# -------------------------
# Overlay
# -------------------------

plt.subplot(1, 4, 4)

plt.imshow(
    image,
    cmap="gray"
)

plt.imshow(
    np.ma.masked_where(
        cleaned_prediction == 0,
        cleaned_prediction
    ),
    alpha=0.6
)

plt.title(
    "SAR + Spill Overlay"
)

plt.axis("off")


plt.tight_layout()

plt.savefig(
    "final_spill_visualization.png",
    dpi=150,
    bbox_inches="tight"
)

plt.show()


print(
    "\nVisualization saved as:"
)

print(
    "final_spill_visualization.png"
)

print(
    "\nFINAL VISUALIZATION COMPLETED ✅"
)