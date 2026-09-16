import os
import torch
import logging

from backend.config import MODEL_PATH

# Import UNet from project root (added to sys.path by config.py)
from unet import UNet


logger = logging.getLogger(__name__)


# ============================================================
# SINGLETON MODEL HOLDER
# ============================================================

_model = None
_device = None


def get_device():
    """Return the torch device (cached)."""

    global _device

    if _device is None:

        _device = torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )

        logger.info("Using device: %s", _device)

        if torch.cuda.is_available():

            gpu_name = torch.cuda.get_device_name(0)

            gpu_mem = (
                torch.cuda.get_device_properties(0).total_memory
                / (1024 ** 3)
            )

            logger.info(
                "GPU: %s (%.2f GB)",
                gpu_name,
                gpu_mem
            )

    return _device


def load_model():
    """Load and cache the U-Net model (singleton)."""

    global _model

    if _model is not None:
        return _model

    device = get_device()

    _model = UNet().to(device)

    if os.path.exists(MODEL_PATH):
        logger.info("Loading U-Net model from: %s", MODEL_PATH)
        try:
            checkpoint = torch.load(
                MODEL_PATH,
                map_location=device,
                weights_only=True
            )
            _model.load_state_dict(checkpoint)
            logger.info("U-Net model loaded successfully ✅")
        except Exception as e:
            logger.warning("Failed to load checkpoint %s: %s. Using initialized model.", MODEL_PATH, e)
    else:
        logger.warning("U-Net weights file not found at: %s. Initialized model with default architecture.", MODEL_PATH)

    _model.eval()

    return _model


def get_model():
    """Get the loaded model (loads on first call)."""

    return load_model()


def is_model_loaded() -> bool:
    """Check if the model is currently loaded."""

    return _model is not None
