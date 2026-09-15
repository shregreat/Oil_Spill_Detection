import numpy as np
import torch
import cv2
import logging

from backend.config import PATCH_SIZE, STRIDE, MIN_AREA_PIXELS
from backend.services.model_service import get_model, get_device


logger = logging.getLogger(__name__)


# ============================================================
# PATCH NORMALIZATION
# ============================================================

def normalize_patch(patch: np.ndarray) -> np.ndarray:
    """Z-score normalize a single image patch."""

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
# FULL IMAGE PREDICTION (SLIDING WINDOW)
# ============================================================

def predict_full_image(image: np.ndarray) -> np.ndarray:
    """
    Run sliding-window prediction over a full SAR image.

    Returns a probability map (0.0 to 1.0) of the same
    shape as the input image.
    """

    model = get_model()
    device = get_device()

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

                # -----------------------------------------
                # Pad to PATCH_SIZE x PATCH_SIZE
                # -----------------------------------------

                padded = np.zeros(
                    (PATCH_SIZE, PATCH_SIZE),
                    dtype=np.float32
                )

                padded[:h, :w] = patch

                # -----------------------------------------
                # Normalize
                # -----------------------------------------

                padded = normalize_patch(padded)

                # -----------------------------------------
                # Convert to tensor
                # -----------------------------------------

                tensor = torch.from_numpy(
                    padded
                ).unsqueeze(0).unsqueeze(0)

                tensor = tensor.to(device)

                # -----------------------------------------
                # Model prediction
                # -----------------------------------------

                output = model(tensor)

                pred = torch.sigmoid(output)

                pred = (
                    pred
                    .squeeze()
                    .cpu()
                    .numpy()
                )

                # Remove padding
                pred = pred[:h, :w]

                # -----------------------------------------
                # Accumulate overlapping predictions
                # -----------------------------------------

                probability[y:y2, x:x2] += pred
                count[y:y2, x:x2] += 1

    # Average overlapping predictions
    probability = probability / np.maximum(count, 1)

    return probability


# ============================================================
# CLEAN PREDICTION (POST-PROCESSING)
# ============================================================

def clean_prediction(prediction: np.ndarray) -> np.ndarray:
    """
    Post-process a binary prediction mask:
    - Remove connected components smaller than MIN_AREA_PIXELS
    - Remove components touching the image border (artifacts)
    """

    prediction = prediction.astype(np.uint8)

    num_labels, labels, stats, _ = (
        cv2.connectedComponentsWithStats(
            prediction,
            connectivity=8
        )
    )

    cleaned = np.zeros_like(prediction)

    height, width = prediction.shape

    for label in range(1, num_labels):

        x = stats[label, cv2.CC_STAT_LEFT]
        y = stats[label, cv2.CC_STAT_TOP]
        w = stats[label, cv2.CC_STAT_WIDTH]
        h = stats[label, cv2.CC_STAT_HEIGHT]
        area = stats[label, cv2.CC_STAT_AREA]

        # Remove small noise
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

        # Keep valid regions
        cleaned[labels == label] = 1

    return cleaned
