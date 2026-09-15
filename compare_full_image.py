import numpy as np
import matplotlib.pyplot as plt
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
THRESHOLD = 0.5


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

                y2 = min(y + PATCH_SIZE, height)
                x2 = min(x + PATCH_SIZE, width)

                patch = image[y:y2, x:x2]

                h, w = patch.shape

                padded = np.zeros(
                    (PATCH_SIZE, PATCH_SIZE),
                    dtype=np.float32
                )

                padded[:h, :w] = patch

                padded = normalize_patch(padded)

                tensor = torch.from_numpy(
                    padded
                ).unsqueeze(0).unsqueeze(0)

                tensor = tensor.to(device)

                output = model(tensor)

                pred = torch.sigmoid(output)

                pred = pred.squeeze().cpu().numpy()

                pred = pred[:h, :w]

                probability[
                    y:y2,
                    x:x2
                ] += pred

                count[
                    y:y2,
                    x:x2
                ] += 1

    probability /= np.maximum(count, 1)

    return probability


# =========================
# LOAD IMAGE
# =========================

print("\nLoading image...")

with rasterio.open(IMAGE_PATH) as src:
    image = src.read(1)

print("Image shape:", image.shape)


# =========================
# LOAD GROUND TRUTH
# =========================

print("Loading ground truth...")

with rasterio.open(MASK_PATH) as src:
    ground_truth = src.read(1)

ground_truth = (
    ground_truth > 0
).astype(np.uint8)


# =========================
# PREDICTION
# =========================

print("\nRunning prediction...")

probability = predict_full_image(image)

prediction = (
    probability >= THRESHOLD
).astype(np.uint8)


# =========================
# DIFFERENCE MAP
# =========================

# 0 = background
# 1 = correct prediction (TP)
# 2 = false positive
# 3 = false negative

difference = np.zeros_like(prediction)

# True Positive
difference[
    (prediction == 1) &
    (ground_truth == 1)
] = 1

# False Positive
difference[
    (prediction == 1) &
    (ground_truth == 0)
] = 2

# False Negative
difference[
    (prediction == 0) &
    (ground_truth == 1)
] = 3


# =========================
# DISPLAY
# =========================

plt.figure(figsize=(18, 5))


plt.subplot(1, 4, 1)

plt.imshow(image, cmap="gray")

plt.title("Original SAR")

plt.axis("off")


plt.subplot(1, 4, 2)

plt.imshow(
    ground_truth,
    cmap="gray"
)

plt.title("Ground Truth")

plt.axis("off")


plt.subplot(1, 4, 3)

plt.imshow(
    prediction,
    cmap="gray"
)

plt.title("Model Prediction")

plt.axis("off")


plt.subplot(1, 4, 4)

plt.imshow(difference)

plt.title(
    "Difference\n"
    "White=Correct | Red=FP | Blue=FN"
)

plt.axis("off")


plt.tight_layout()

plt.savefig(
    "full_image_comparison.png",
    dpi=150,
    bbox_inches="tight"
)

plt.show()


print("\n================================")
print("COMPARISON COMPLETED ✅")
print("================================")

print(
    "Saved as: full_image_comparison.png"
)