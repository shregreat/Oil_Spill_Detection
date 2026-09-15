import cv2
import numpy as np
import matplotlib.pyplot as plt
import torch
import rasterio

from unet import UNet


# ============================================================
# CONFIGURATION
# ============================================================

IMAGE_PATH = "Radar_data/train/images/2018_08_21_.tif"
MASK_PATH = "Radar_data/train/masks/2018_08_21_.tif"
MODEL_PATH = "best_oil_spill_unet.pth"

PATCH_SIZE = 256
STRIDE = 128
THRESHOLD = 0.5


# ============================================================
# DEVICE
# ============================================================

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

print("Using device:", device)


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


# ============================================================
# NORMALIZATION
# ============================================================

def normalize_patch(patch):

    patch = patch.astype(np.float32)

    patch = np.nan_to_num(
        patch,
        nan=0.0,
        posinf=0.0,
        neginf=0.0
    )

    mean = patch.mean()
    std = patch.std()

    if std > 0:
        patch = (patch - mean) / std
    else:
        patch = patch - mean

    return patch


# ============================================================
# LOAD IMAGE
# ============================================================

with rasterio.open(IMAGE_PATH) as src:

    image = src.read(1).astype(np.float32)

    height, width = image.shape


print("Image shape:", image.shape)


# ============================================================
# LOAD GROUND TRUTH MASK
# ============================================================

with rasterio.open(MASK_PATH) as src:

    ground_truth = src.read(1)


ground_truth = (ground_truth > 0).astype(np.uint8)

print("Ground Truth unique values:",
      np.unique(ground_truth))


# ============================================================
# PREDICTION MAP
# ============================================================

probability_map = np.zeros(
    (height, width),
    dtype=np.float32
)

count_map = np.zeros(
    (height, width),
    dtype=np.float32
)


print("Running prediction...")


for y in range(0, height, STRIDE):

    for x in range(0, width, STRIDE):

        y_end = min(
            y + PATCH_SIZE,
            height
        )

        x_end = min(
            x + PATCH_SIZE,
            width
        )

        patch = image[
            y:y_end,
            x:x_end
        ]

        patch_h, patch_w = patch.shape


        # ----------------------------------------------------
        # PAD
        # ----------------------------------------------------

        padded = np.zeros(
            (PATCH_SIZE, PATCH_SIZE),
            dtype=np.float32
        )

        padded[
            :patch_h,
            :patch_w
        ] = patch


        # ----------------------------------------------------
        # NORMALIZE
        # ----------------------------------------------------

        padded = normalize_patch(padded)


        # ----------------------------------------------------
        # TENSOR
        # ----------------------------------------------------

        tensor = torch.from_numpy(
            padded
        ).unsqueeze(0).unsqueeze(0)

        tensor = tensor.to(device)


        # ----------------------------------------------------
        # PREDICTION
        # ----------------------------------------------------

        with torch.no_grad():

            output = model(tensor)

            probability = torch.sigmoid(
                output
            )


        probability = (
            probability
            .squeeze()
            .cpu()
            .numpy()
        )


        probability = probability[
            :patch_h,
            :patch_w
        ]


        probability_map[
            y:y_end,
            x:x_end
        ] += probability

        count_map[
            y:y_end,
            x:x_end
        ] += 1


# ============================================================
# AVERAGE OVERLAPPING PATCHES
# ============================================================

count_map[
    count_map == 0
] = 1

probability_map = (
    probability_map / count_map
)


# ============================================================
# PREDICTED MASK
# ============================================================

predicted_mask = (
    probability_map >= THRESHOLD
).astype(np.uint8)


# ============================================================
# REMOVE SMALL COMPONENTS
# ============================================================

num_labels, labels, stats, centroids = (
    cv2.connectedComponentsWithStats(
        predicted_mask,
        connectivity=8
    )
)


clean_prediction = np.zeros_like(
    predicted_mask
)


MIN_AREA_PIXELS = 100


for i in range(1, num_labels):

    area = stats[
        i,
        cv2.CC_STAT_AREA
    ]

    if area >= MIN_AREA_PIXELS:

        clean_prediction[
            labels == i
        ] = 1


# ============================================================
# METRICS
# ============================================================

gt = ground_truth.astype(bool)
pred = clean_prediction.astype(bool)

TP = np.logical_and(
    pred,
    gt
).sum()

FP = np.logical_and(
    pred,
    ~gt
).sum()

FN = np.logical_and(
    ~pred,
    gt
).sum()


iou = TP / (
    TP + FP + FN + 1e-8
)

dice = (
    2 * TP
) / (
    2 * TP + FP + FN + 1e-8
)

precision = TP / (
    TP + FP + 1e-8
)

recall = TP / (
    TP + FN + 1e-8
)


# ============================================================
# PRINT METRICS
# ============================================================

print()
print("======================================")
print("GROUND TRUTH vs PREDICTION")
print("======================================")

print(
    "IoU       :", round(iou, 4)
)

print(
    "Dice      :", round(dice, 4)
)

print(
    "Precision :", round(precision, 4)
)

print(
    "Recall    :", round(recall, 4)
)


# ============================================================
# DISPLAY NORMALIZATION
# ============================================================

p2 = np.nanpercentile(
    image,
    2
)

p98 = np.nanpercentile(
    image,
    98
)

display_image = (
    image - p2
) / (
    p98 - p2 + 1e-8
)

display_image = np.clip(
    display_image,
    0,
    1
)


# ============================================================
# VISUALIZATION
# ============================================================

plt.figure(
    figsize=(18, 6)
)


# ------------------------------------------------------------
# 1. ORIGINAL SAR
# ------------------------------------------------------------

plt.subplot(1, 4, 1)

plt.imshow(
    display_image,
    cmap="gray"
)

plt.title(
    "Original SAR"
)

plt.axis("off")


# ------------------------------------------------------------
# 2. GROUND TRUTH
# ------------------------------------------------------------

plt.subplot(1, 4, 2)

plt.imshow(
    ground_truth,
    cmap="gray"
)

plt.title(
    "Ground Truth Mask"
)

plt.axis("off")


# ------------------------------------------------------------
# 3. MODEL PREDICTION
# ------------------------------------------------------------

plt.subplot(1, 4, 3)

plt.imshow(
    clean_prediction,
    cmap="gray"
)

plt.title(
    "Model Prediction"
)

plt.axis("off")


# ------------------------------------------------------------
# 4. COMPARISON
# ------------------------------------------------------------

comparison = np.zeros(
    (height, width, 3),
    dtype=np.float32
)

# Ground truth
comparison[
    gt
] = [1, 0, 0]

# Prediction
comparison[
    pred
] = [0, 1, 0]

# Both
comparison[
    np.logical_and(gt, pred)
] = [1, 1, 0]


plt.subplot(1, 4, 4)

plt.imshow(
    comparison
)

plt.title(
    "GT vs Prediction"
)

plt.axis("off")


plt.tight_layout()

plt.show()


print()
print("COMPARISON COMPLETED! ✅")