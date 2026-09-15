import tifffile
import matplotlib.pyplot as plt

# One processed image and its mask
image_path = "processed_data/train/images/patch_0000.tif"
mask_path = "processed_data/train/masks/patch_0000.tif"

# Read files
image = tifffile.imread(image_path)
mask = tifffile.imread(mask_path)

print("Image shape:", image.shape)
print("Mask shape:", mask.shape)
print("Oil pixels:", int(mask.sum()))

# Show image
plt.figure(figsize=(6, 6))
plt.imshow(image, cmap="gray")
plt.title("Processed SAR Patch")
plt.axis("off")
plt.show()

# Show mask
plt.figure(figsize=(6, 6))
plt.imshow(mask, cmap="gray")
plt.title("Processed Oil Spill Mask")
plt.axis("off")
plt.show()