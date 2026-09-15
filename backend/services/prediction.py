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

def predict_full_image(image: np.ndarray, batch_size: int = 16) -> np.ndarray:
    """
    Run batched sliding-window prediction over a full SAR image.
    Processes patches in mini-batches for 5-10x throughput improvement.

    Returns a probability map (0.0 to 1.0) of the same shape as input image.
    """
    model = get_model()
    device = get_device()

    height, width = image.shape

    probability = np.zeros((height, width), dtype=np.float32)
    count = np.zeros((height, width), dtype=np.float32)

    batch_tensors = []
    batch_coords = []

    def flush_batch():
        if not batch_tensors:
            return
        inp = torch.stack(batch_tensors).to(device)
        out = model(inp)
        preds = torch.sigmoid(out).squeeze(1).cpu().numpy()
        for i, (y, y2, x, x2, h, w) in enumerate(batch_coords):
            p = preds[i][:h, :w]
            probability[y:y2, x:x2] += p
            count[y:y2, x:x2] += 1
        batch_tensors.clear()
        batch_coords.clear()

    with torch.no_grad():
        for y in range(0, height, STRIDE):
            for x in range(0, width, STRIDE):
                y2 = min(y + PATCH_SIZE, height)
                x2 = min(x + PATCH_SIZE, width)
                patch = image[y:y2, x:x2]
                h, w = patch.shape

                padded = np.zeros((PATCH_SIZE, PATCH_SIZE), dtype=np.float32)
                padded[:h, :w] = patch
                padded = normalize_patch(padded)

                tensor = torch.from_numpy(padded).unsqueeze(0)  # Shape: (1, 256, 256)
                batch_tensors.append(tensor)
                batch_coords.append((y, y2, x, x2, h, w))

                if len(batch_tensors) >= batch_size:
                    flush_batch()

        flush_batch()

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
