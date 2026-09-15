import csv
import os

import numpy as np
import tifffile
import torch
from torch.utils.data import Dataset, DataLoader


class OilSpillDataset(Dataset):

    def __init__(self, csv_file):

        self.rows = []
        self.skipped = 0

        # ---------------------------------------------
        # Read CSV
        # ---------------------------------------------

        with open(csv_file, "r", encoding="utf-8") as file:

            reader = csv.DictReader(file)

            all_rows = list(reader)

        print("CSV samples:", len(all_rows))

        # ---------------------------------------------
        # Cache image dimensions
        # ---------------------------------------------

        dimension_cache = {}

        for row in all_rows:

            filename = (
                row["paths"]
                .replace("\\", "/")
                .split("/")[-1]
            )

            image_path = os.path.join(
                "Radar_data",
                "train",
                "images",
                filename
            )

            mask_path = os.path.join(
                "Radar_data",
                "train",
                "masks",
                filename
            )

            # Check files

            if not os.path.exists(image_path):

                self.skipped += 1
                continue

            if not os.path.exists(mask_path):

                self.skipped += 1
                continue

            # -----------------------------------------
            # Read image dimensions only once
            # -----------------------------------------

            if filename not in dimension_cache:

                try:

                    image = tifffile.imread(
                        image_path
                    )

                    mask = tifffile.imread(
                        mask_path
                    )

                    image_shape = image.shape[:2]
                    mask_shape = mask.shape[:2]

                    dimension_cache[filename] = (
                        image_shape,
                        mask_shape
                    )

                except Exception as e:

                    print(
                        "Could not read:",
                        filename
                    )

                    print(
                        "Reason:",
                        e
                    )

                    dimension_cache[filename] = None

            # -----------------------------------------
            # Use cached dimensions
            # -----------------------------------------

            else:

                cached = dimension_cache[filename]

                if cached is None:
                    continue

                image_shape, mask_shape = cached

            # -----------------------------------------
            # Skip unreadable files
            # -----------------------------------------

            if dimension_cache[filename] is None:

                self.skipped += 1
                continue

            height, width = image_shape

            mask_height, mask_width = mask_shape

            # -----------------------------------------
            # Read CSV coordinates
            # -----------------------------------------

            try:

                x, y = map(
                    int,
                    row["coordinates"].split(",")
                )

            except Exception:

                self.skipped += 1
                continue

            # -----------------------------------------
            # Coordinate interpretation:
            # CSV = (x, y)
            # -----------------------------------------

            valid = (
                x >= 256
                and y >= 256
                and x <= width
                and y <= height
                and x <= mask_width
                and y <= mask_height
            )

            if valid:

                self.rows.append(row)

            else:

                self.skipped += 1

        # ---------------------------------------------
        # Final information
        # ---------------------------------------------

        print(
            "Valid samples:",
            len(self.rows)
        )

        print(
            "Skipped invalid samples:",
            self.skipped
        )

        print(
            "Unique images checked:",
            len(dimension_cache)
        )

    # =================================================
    # LENGTH
    # =================================================

    def __len__(self):

        return len(self.rows)

    # =================================================
    # GET ITEM
    # =================================================

    def __getitem__(self, index):

        row = self.rows[index]

        filename = (
            row["paths"]
            .replace("\\", "/")
            .split("/")[-1]
        )

        x, y = map(
            int,
            row["coordinates"].split(",")
        )

        image_path = os.path.join(
            "Radar_data",
            "train",
            "images",
            filename
        )

        mask_path = os.path.join(
            "Radar_data",
            "train",
            "masks",
            filename
        )

        # ---------------------------------------------
        # Load image and mask
        # ---------------------------------------------

        image = tifffile.imread(
            image_path
        )

        mask = tifffile.imread(
            mask_path
        )

        # ---------------------------------------------
        # Extract 256 x 256 patch
        # ---------------------------------------------

        image_patch = image[
            y - 256:y,
            x - 256:x
        ]

        mask_patch = mask[
            y - 256:y,
            x - 256:x
        ]

        # ---------------------------------------------
        # Safety checks
        # ---------------------------------------------

        if image_patch.shape != (256, 256):

            raise ValueError(
                f"Invalid image patch: {filename} "
                f"coordinates=({x},{y}) "
                f"image_shape={image.shape} "
                f"patch_shape={image_patch.shape}"
            )

        if mask_patch.shape != (256, 256):

            raise ValueError(
                f"Invalid mask patch: {filename} "
                f"coordinates=({x},{y}) "
                f"mask_shape={mask.shape} "
                f"patch_shape={mask_patch.shape}"
            )

        # ---------------------------------------------
        # Float32
        # ---------------------------------------------

        image_patch = image_patch.astype(
            np.float32
        )

        mask_patch = mask_patch.astype(
            np.float32
        )

        # ---------------------------------------------
        # Normalize image
        # ---------------------------------------------

        mean = image_patch.mean()
        std = image_patch.std()

        if np.isfinite(std) and std > 0:

            image_patch = (
                image_patch - mean
            ) / std

        else:

            image_patch = (
                image_patch - mean
            )

        # ---------------------------------------------
        # Remove NaN / infinity
        # ---------------------------------------------

        image_patch = np.nan_to_num(
            image_patch,
            nan=0.0,
            posinf=0.0,
            neginf=0.0
        )

        # ---------------------------------------------
        # Add channel dimension
        # ---------------------------------------------

        image_patch = np.expand_dims(
            image_patch,
            axis=0
        )

        mask_patch = np.expand_dims(
            mask_patch,
            axis=0
        )

        # ---------------------------------------------
        # Convert to Tensor
        # ---------------------------------------------

        image_tensor = torch.from_numpy(
            image_patch
        )

        mask_tensor = torch.from_numpy(
            mask_patch
        )

        return image_tensor, mask_tensor


# =====================================================
# TEST
# =====================================================

if __name__ == "__main__":

    print("\n================================")
    print("DATASET TEST")
    print("================================")

    train_dataset = OilSpillDataset(
        "Radar_data/train/dataframe_train_dataset_256_90.csv"
    )

    print("\nCreating DataLoader...")

    train_loader = DataLoader(
        train_dataset,
        batch_size=2,
        shuffle=True,
        num_workers=0
    )

    print("Getting first batch...")

    images, masks = next(
        iter(train_loader)
    )

    print("\n================================")
    print("DATALOADER TEST")
    print("================================")

    print(
        "Batch image shape:",
        images.shape
    )

    print(
        "Batch mask shape:",
        masks.shape
    )

    print(
        "Image dtype:",
        images.dtype
    )

    print(
        "Mask dtype:",
        masks.dtype
    )

    print(
        "Mask unique values:",
        torch.unique(masks)
    )

    print("\nDATASET TEST PASSED! ✅")