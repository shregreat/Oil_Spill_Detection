import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Subset

from dataset import OilSpillDataset
from unet import UNet


# ============================================================
# CONFIGURATION
# ============================================================

TRAIN_SAMPLES = 1000
VAL_SAMPLES = 200

EPOCHS = 10
BATCH_SIZE = 4

LEARNING_RATE = 1e-4

MODEL_PATH = "best_oil_spill_unet.pth"


# ============================================================
# DICE LOSS
# ============================================================

class DiceLoss(nn.Module):

    def __init__(self):
        super().__init__()

    def forward(self, logits, targets):

        probabilities = torch.sigmoid(logits)

        probabilities = probabilities.reshape(-1)
        targets = targets.reshape(-1)

        intersection = (probabilities * targets).sum()

        dice = (
            2.0 * intersection + 1e-6
        ) / (
            probabilities.sum()
            + targets.sum()
            + 1e-6
        )

        return 1.0 - dice


# ============================================================
# BCE + DICE LOSS
# ============================================================

class BCEDiceLoss(nn.Module):

    def __init__(self):
        super().__init__()

        self.bce = nn.BCEWithLogitsLoss()
        self.dice = DiceLoss()

    def forward(self, logits, targets):

        bce_loss = self.bce(
            logits,
            targets
        )

        dice_loss = self.dice(
            logits,
            targets
        )

        return bce_loss + dice_loss


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("======================================")
    print("       OIL SPILL U-NET TRAINING")
    print("======================================")
    print()


    # ========================================================
    # DEVICE
    # ========================================================

    device = torch.device(
        "cuda" if torch.cuda.is_available() else "cpu"
    )

    print("Using device:", device)

    if torch.cuda.is_available():

        print(
            "GPU:",
            torch.cuda.get_device_name(0)
        )

        gpu_memory = (
            torch.cuda.get_device_properties(0).total_memory
            / (1024 ** 3)
        )

        print(
            "GPU Memory:",
            round(gpu_memory, 2),
            "GB"
        )

    else:

        print("WARNING: CUDA is not available.")
        print("Training will run on CPU.")

    print()


    # ========================================================
    # TRAINING DATASET
    # ========================================================

    print("Loading training dataset...")

    train_dataset = OilSpillDataset(
        "Radar_data/train/dataframe_train_dataset_256_90.csv"
    )

    print(
        "Total training samples available:",
        len(train_dataset)
    )

    print()


    # ========================================================
    # VALIDATION DATASET
    # ========================================================

    print("Loading validation dataset...")

    val_dataset = OilSpillDataset(
        "Radar_data/train/dataframe_val_dataset_256_90.csv"
    )

    print(
        "Total validation samples available:",
        len(val_dataset)
    )

    print()


    # ========================================================
    # SELECT SUBSETS
    # ========================================================

    train_count = min(
        TRAIN_SAMPLES,
        len(train_dataset)
    )

    val_count = min(
        VAL_SAMPLES,
        len(val_dataset)
    )

    train_subset = Subset(
        train_dataset,
        range(train_count)
    )

    val_subset = Subset(
        val_dataset,
        range(val_count)
    )

    print(
        "Training samples used:",
        len(train_subset)
    )

    print(
        "Validation samples used:",
        len(val_subset)
    )

    print()


    # ========================================================
    # DATALOADERS
    # ========================================================

    train_loader = DataLoader(
        train_subset,
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=0,
        pin_memory=torch.cuda.is_available()
    )

    val_loader = DataLoader(
        val_subset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0,
        pin_memory=torch.cuda.is_available()
    )

    print(
        "Training batches:",
        len(train_loader)
    )

    print(
        "Validation batches:",
        len(val_loader)
    )

    print()


    # ========================================================
    # MODEL
    # ========================================================

    print("Creating U-Net model...")

    model = UNet()

    model = model.to(device)

    print(
        "Model moved to:",
        device
    )

    print()


    # ========================================================
    # LOSS FUNCTION
    # ========================================================

    criterion = BCEDiceLoss()


    # ========================================================
    # OPTIMIZER
    # ========================================================

    optimizer = torch.optim.Adam(
        model.parameters(),
        lr=LEARNING_RATE
    )


    # ========================================================
    # BEST VALIDATION LOSS
    # ========================================================

    best_val_loss = float("inf")


    # ========================================================
    # TRAINING LOOP
    # ========================================================

    for epoch in range(EPOCHS):

        print("--------------------------------------")
        print(
            f"Epoch {epoch + 1}/{EPOCHS}"
        )
        print("--------------------------------------")


        # ====================================================
        # TRAINING
        # ====================================================

        model.train()

        running_train_loss = 0.0

        for batch_idx, (images, masks) in enumerate(
            train_loader
        ):

            # Move data to GPU
            images = images.to(
                device,
                non_blocking=True
            )

            masks = masks.to(
                device,
                non_blocking=True
            )


            # Clear gradients
            optimizer.zero_grad()


            # Forward pass
            outputs = model(images)


            # Calculate loss
            loss = criterion(
                outputs,
                masks
            )


            # Backpropagation
            loss.backward()


            # Update weights
            optimizer.step()


            running_train_loss += loss.item()


            # ------------------------------------------------
            # Progress
            # ------------------------------------------------

            if (
                (batch_idx + 1) % 25 == 0
                or
                (batch_idx + 1) == len(train_loader)
            ):

                print(
                    f"Batch {batch_idx + 1}/"
                    f"{len(train_loader)} "
                    f"- Loss: {loss.item():.4f}"
                )


        # Average training loss

        train_loss = (
            running_train_loss
            / len(train_loader)
        )


        # ====================================================
        # VALIDATION
        # ====================================================

        model.eval()

        running_val_loss = 0.0

        with torch.no_grad():

            for images, masks in val_loader:

                images = images.to(
                    device,
                    non_blocking=True
                )

                masks = masks.to(
                    device,
                    non_blocking=True
                )

                outputs = model(images)

                loss = criterion(
                    outputs,
                    masks
                )

                running_val_loss += loss.item()


        # Average validation loss

        val_loss = (
            running_val_loss
            / len(val_loader)
        )


        # ====================================================
        # PRINT RESULTS
        # ====================================================

        print()

        print(
            f"Training Loss: {train_loss:.4f}"
        )

        print(
            f"Validation Loss: {val_loss:.4f}"
        )


        # ====================================================
        # SAVE BEST MODEL
        # ====================================================

        if val_loss < best_val_loss:

            best_val_loss = val_loss

            torch.save(
                model.state_dict(),
                MODEL_PATH
            )

            print()
            print("Best model saved! ✅")

        else:

            print()
            print("Best model not improved.")

        print()


    # ========================================================
    # TRAINING COMPLETED
    # ========================================================

    print("======================================")
    print("       TRAINING COMPLETED! ✅")
    print("======================================")

    print()

    print(
        "Best validation loss:",
        f"{best_val_loss:.6f}"
    )

    print(
        "Saved model:",
        MODEL_PATH
    )

    print()


    # ========================================================
    # GPU MEMORY
    # ========================================================

    if torch.cuda.is_available():

        allocated = (
            torch.cuda.memory_allocated(0)
            / (1024 ** 3)
        )

        reserved = (
            torch.cuda.memory_reserved(0)
            / (1024 ** 3)
        )

        print(
            "GPU memory allocated:",
            round(allocated, 2),
            "GB"
        )

        print(
            "GPU memory reserved:",
            round(reserved, 2),
            "GB"
        )


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":
    main()