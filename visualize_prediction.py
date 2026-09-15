import torch
import matplotlib.pyplot as plt

from dataset import OilSpillDataset
from unet import UNet


# ============================================================
# LOAD VALIDATION DATASET
# ============================================================

val_dataset = OilSpillDataset(
    "Radar_data/train/dataframe_val_dataset_256_90.csv"
)


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


# ============================================================
# LOAD BEST MODEL
# ============================================================

model = UNet().to(device)

model.load_state_dict(
    torch.load(
        "best_oil_spill_unet.pth",
        map_location=device
    )
)

model.eval()

print("Best model loaded successfully! ✅")


# ============================================================
# SELECT 5 VALIDATION SAMPLES
# ============================================================

sample_indices = [0, 1, 2, 3, 4]


# ============================================================
# CREATE FIGURE
# ============================================================

plt.figure(figsize=(15, 15))


# ============================================================
# PREDICT 5 SAMPLES
# ============================================================

for i, index in enumerate(sample_indices):

    image, mask = val_dataset[index]

    image_input = image.unsqueeze(0).to(device)

    # --------------------------------------------------------
    # Prediction
    # --------------------------------------------------------

    with torch.no_grad():

        output = model(image_input)

        probability = torch.sigmoid(output)

        predicted_mask = (
            probability >= 0.5
        ).float()


    # --------------------------------------------------------
    # Convert to NumPy
    # --------------------------------------------------------

    image_display = (
        image.squeeze(0)
        .cpu()
        .numpy()
    )

    mask_display = (
        mask.squeeze(0)
        .cpu()
        .numpy()
    )

    prediction_display = (
        predicted_mask
        .squeeze()
        .cpu()
        .numpy()
    )


    # --------------------------------------------------------
    # Print pixel information
    # --------------------------------------------------------

    print()
    print(
        f"Sample {index}"
    )

    print(
        "Ground truth oil pixels:",
        int(mask.sum())
    )

    print(
        "Predicted oil pixels:",
        int(predicted_mask.sum())
    )


    # ========================================================
    # PLOT
    # ========================================================

    # SAR Image

    plt.subplot(5, 3, i * 3 + 1)

    plt.imshow(
        image_display,
        cmap="gray"
    )

    plt.title(
        f"Sample {index} - SAR"
    )

    plt.axis("off")


    # Ground Truth

    plt.subplot(5, 3, i * 3 + 2)

    plt.imshow(
        mask_display,
        cmap="gray"
    )

    plt.title(
        "Ground Truth"
    )

    plt.axis("off")


    # Prediction

    plt.subplot(5, 3, i * 3 + 3)

    plt.imshow(
        prediction_display,
        cmap="gray"
    )

    plt.title(
        "U-Net Prediction"
    )

    plt.axis("off")


# ============================================================
# DISPLAY
# ============================================================

plt.tight_layout()

plt.show()