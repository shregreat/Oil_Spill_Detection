import os
import tifffile

images_folder = "Radar_data/train/images"
masks_folder = "Radar_data/train/masks"

images = sorted([f for f in os.listdir(images_folder) if f.endswith(".tif")])

print("Checking all image-mask pairs...\n")

all_valid = True

for filename in images:

    image_path = os.path.join(images_folder, filename)
    mask_path = os.path.join(masks_folder, filename)

    image = tifffile.imread(image_path)
    mask = tifffile.imread(mask_path)

    same_shape = image.shape == mask.shape
    valid_mask = set(mask.flatten()).issubset({0.0, 1.0})

    print(
        filename,
        "| Image:", image.shape,
        "| Mask:", mask.shape,
        "| Shape Match:", same_shape,
        "| Mask Valid:", valid_mask
    )

    if not same_shape or not valid_mask:
        all_valid = False

print("\n--------------------------------")
if all_valid:
    print("ALL DATASET CHECKS PASSED! ✅")
else:
    print("Some files need checking. ❌")