import numpy as np
import torch
import rasterio

from unet import UNet


# =========================
# SETTINGS
# =========================

IMAGE_PATH = "Radar_data/train/images/20190816.tif"
MASK_PATH = "Radar_data/train/masks/20190816.tif"
MODEL_PATH = "best_oil_spill_unet.pth"

PATCH_SIZE = 256
STRIDE = 128

THRESHOLDS = [0.65, 0.70, 0.75, 0.80, 0.85, 0.90]


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
# LOAD IMAGE
# =========================

print("\nLoading image...")

with rasterio.open(
    IMAGE_PATH
) as src:

    image = src.read(1)

print(
    "Image shape:",
    image.shape
)


# =========================
# LOAD GROUND TRUTH
# =========================

print(
    "Loading ground truth..."
)

with rasterio.open(
    MASK_PATH
) as src:

    ground_truth = src.read(1)

ground_truth = (
    ground_truth > 0
).astype(np.uint8)

print(
    "Ground truth loaded ✅"
)


# =========================
# PREDICTION
# =========================

print(
    "\nRunning prediction..."
)

probability = predict_full_image(
    image
)

print(
    "Prediction completed ✅"
)


# =========================
# THRESHOLD TESTING
# =========================

print("\n")
print("==============================================")
print("THRESHOLD ANALYSIS")
print("==============================================")

print(
    f"{'Threshold':<12}"
    f"{'IoU':<12}"
    f"{'Dice':<12}"
    f"{'Precision':<12}"
    f"{'Recall':<12}"
)

print("----------------------------------------------")


best_iou = -1
best_threshold = None


for threshold in THRESHOLDS:

    prediction = (
        probability >= threshold
    ).astype(np.uint8)

    TP = np.logical_and(
        prediction == 1,
        ground_truth == 1
    ).sum()

    FP = np.logical_and(
        prediction == 1,
        ground_truth == 0
    ).sum()

    FN = np.logical_and(
        prediction == 0,
        ground_truth == 1
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


    print(
        f"{threshold:<12.1f}"
        f"{iou:<12.4f}"
        f"{dice:<12.4f}"
        f"{precision:<12.4f}"
        f"{recall:<12.4f}"
    )


    if iou > best_iou:

        best_iou = iou
        best_threshold = threshold


# =========================
# BEST RESULT
# =========================

print("----------------------------------------------")

print(
    f"\nBEST THRESHOLD: {best_threshold}"
)

print(
    f"BEST IoU      : {best_iou:.4f}"
)

print(
    "=============================================="
)

print(
    "\nTHRESHOLD ANALYSIS COMPLETED ✅"
)