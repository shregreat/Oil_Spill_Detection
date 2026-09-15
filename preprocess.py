import csv
import os
import tifffile
import numpy as np

csv_path = "Radar_data/train/dataframe_train_dataset_256_90.csv"

with open(csv_path, "r", encoding="utf-8") as file:
    reader = csv.DictReader(file)
    row = next(reader)

filename = row["paths"].split("\\")[-1]

x, y = map(int, row["coordinates"].split(","))

image_path = os.path.join(
    "Radar_data", "train", "images", filename
)

mask_path = os.path.join(
    "Radar_data", "train", "masks", filename
)

image = tifffile.imread(image_path)
mask = tifffile.imread(mask_path)

# Correct patch extraction
image_patch = image[y-256:y, x-256:x]
mask_patch = mask[y-256:y, x-256:x]

print("Image:", filename)
print("Patch shape:", image_patch.shape)

print("\nImage statistics:")
print("Minimum:", image_patch.min())
print("Maximum:", image_patch.max())
print("Mean:", image_patch.mean())
print("Standard deviation:", image_patch.std())

print("\nMask statistics:")
print("Unique values:", np.unique(mask_patch))
print("Oil pixels:", int(mask_patch.sum()))
print("Unique values:", np.unique(mask_patch))
print("Oil pixels:", int(mask_patch.sum()))