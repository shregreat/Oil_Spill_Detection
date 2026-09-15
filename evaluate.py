import torch
from torch.utils.data import DataLoader, Subset

from dataset import OilSpillDataset
from unet import UNet


# ==================================================
# METRICS
# ==================================================

def calculate_metrics(predictions, targets):

    # Convert logits to probabilities
    probabilities = torch.sigmoid(predictions)

    # Convert probability to binary mask
    predicted_mask = (probabilities >= 0.5).float()

    # Flatten
    predicted_mask = predicted_mask.view(-1)
    targets = targets.view(-1)

    # True positives, false positives, false negatives
    tp = (predicted_mask * targets).sum()

    fp = (predicted_mask * (1 - targets)).sum()

    fn = ((1 - predicted_mask) * targets).sum()

    # Small value to avoid division by zero
    epsilon = 1e-7

    # IoU
    iou = (
        tp + epsilon
    ) / (
        tp + fp + fn + epsilon
    )

    # Dice
    dice = (
        2 * tp + epsilon
    ) / (
        2 * tp + fp + fn + epsilon
    )

    # Precision
    precision = (
        tp + epsilon
    ) / (
        tp + fp + epsilon
    )

    # Recall
    recall = (
        tp + epsilon
    ) / (
        tp + fn + epsilon
    )

    return (
        iou.item(),
        dice.item(),
        precision.item(),
        recall.item()
    )


# ==================================================
# MAIN
# ==================================================

if __name__ == "__main__":

    print("Starting model evaluation...\n")

    # CPU
    device = torch.device("cpu")

    # --------------------------------------------------
    # Load validation dataset
    # --------------------------------------------------

    val_dataset = OilSpillDataset(
        "Radar_data/train/dataframe_val_dataset_256_90.csv"
    )

    # Use 10 samples for test
    val_subset = Subset(
        val_dataset,
        range(10)
    )

    val_loader = DataLoader(
        val_subset,
        batch_size=2,
        shuffle=False,
        num_workers=0
    )

    print("Validation samples:", len(val_subset))

    # --------------------------------------------------
    # Load U-Net
    # --------------------------------------------------

    model = UNet().to(device)

    model.load_state_dict(
        torch.load(
            "best_oil_spill_unet.pth",
            map_location=device
        )
    )

    model.eval()

    print("Model loaded successfully! ✅")

    # --------------------------------------------------
    # Calculate metrics
    # --------------------------------------------------

    total_iou = 0.0
    total_dice = 0.0
    total_precision = 0.0
    total_recall = 0.0

    with torch.no_grad():

        for batch_number, (images, masks) in enumerate(val_loader):

            images = images.to(device)
            masks = masks.to(device)

            predictions = model(images)

            iou, dice, precision, recall = calculate_metrics(
                predictions,
                masks
            )

            total_iou += iou
            total_dice += dice
            total_precision += precision
            total_recall += recall

            print(
                f"Batch {batch_number + 1}/{len(val_loader)} "
                f"| IoU: {iou:.4f} "
                f"| Dice: {dice:.4f} "
                f"| Precision: {precision:.4f} "
                f"| Recall: {recall:.4f}"
            )

    # --------------------------------------------------
    # Average metrics
    # --------------------------------------------------

    number_of_batches = len(val_loader)

    average_iou = total_iou / number_of_batches
    average_dice = total_dice / number_of_batches
    average_precision = total_precision / number_of_batches
    average_recall = total_recall / number_of_batches

    print("\n================================")
    print("FINAL VALIDATION METRICS")
    print("================================")

    print(f"IoU:       {average_iou:.4f}")
    print(f"Dice:      {average_dice:.4f}")
    print(f"Precision: {average_precision:.4f}")
    print(f"Recall:    {average_recall:.4f}")

    print("\nEvaluation completed! ✅")