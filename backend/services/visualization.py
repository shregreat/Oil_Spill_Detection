import base64
import cv2
import numpy as np
import logging

logger = logging.getLogger(__name__)


# ============================================================
# CREATE VISUAL OVERLAY FOR WEB FRONTEND
# ============================================================

def create_overlay_png(
    image: np.ndarray,
    mask: np.ndarray,
    max_dimension: int = 1200
) -> tuple[bytes, str]:
    """
    Generate a web-compatible PNG image overlaying detected oil spill
    regions on top of the grayscale SAR imagery.

    Args:
        image: Original 2D numpy array (SAR amplitude/intensity)
        mask: Binary prediction mask (0/1, uint8)
        max_dimension: Downsample large SAR images for fast web transfer

    Returns:
        tuple of (png_bytes, base64_data_uri)
    """
    # ---------------------------------------------------------
    # 1. Normalize SAR image to 8-bit grayscale [0, 255]
    # ---------------------------------------------------------
    # Robust percentile-based normalization to prevent SAR speckle outliers
    img_float = image.astype(np.float32)
    p2, p98 = np.percentile(img_float, (2, 98))
    if p98 > p2:
        img_norm = np.clip((img_float - p2) / (p98 - p2), 0.0, 1.0)
    else:
        img_norm = np.clip(img_float / (np.max(img_float) + 1e-6), 0.0, 1.0)

    gray = (img_norm * 255.0).astype(np.uint8)

    # Convert to 3-channel RGB (OpenCV uses BGR)
    rgb = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)

    # ---------------------------------------------------------
    # 2. Downsample if image is excessively large for web transfer
    # ---------------------------------------------------------
    h, w = gray.shape
    if max(h, w) > max_dimension:
        scale = max_dimension / max(h, w)
        new_w = int(w * scale)
        new_h = int(h * scale)
        rgb = cv2.resize(rgb, (new_w, new_h), interpolation=cv2.INTER_AREA)
        resized_mask = cv2.resize(mask.astype(np.uint8), (new_w, new_h), interpolation=cv2.INTER_NEAREST)
    else:
        resized_mask = mask.astype(np.uint8)

    # ---------------------------------------------------------
    # 3. Create semi-transparent spill overlay (Bright Red/Coral)
    # ---------------------------------------------------------
    overlay = rgb.copy()
    # BGR color for oil spill overlay: vibrant crimson/red (B=40, G=40, R=240)
    spill_color = np.array([40, 40, 240], dtype=np.uint8)

    spill_indices = resized_mask == 1
    if np.any(spill_indices):
        # Alpha blend 50% overlay on spill pixels
        overlay[spill_indices] = cv2.addWeighted(
            rgb[spill_indices], 0.45,
            np.tile(spill_color, (np.sum(spill_indices), 1)), 0.55,
            0.0
        )

        # Draw contour boundary lines in bright yellow/amber (B=0, G=215, R=255)
        contours, _ = cv2.findContours(resized_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(overlay, contours, -1, (0, 215, 255), 2)

    # ---------------------------------------------------------
    # 4. Encode as PNG
    # ---------------------------------------------------------
    success, buffer = cv2.imencode(".png", overlay, [cv2.IMWRITE_PNG_COMPRESSION, 6])
    if not success:
        raise RuntimeError("Failed to encode visualization to PNG")

    png_bytes = buffer.tobytes()
    base64_str = base64.b64encode(png_bytes).decode("ascii")
    data_uri = f"data:image/png;base64,{base64_str}"

    return png_bytes, data_uri
