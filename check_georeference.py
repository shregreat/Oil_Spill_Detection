import tifffile

# ============================================================
# TIFF FILE
# ============================================================

tiff_path = (
    "Radar_data/train/images/20200307.tif"
)

print("Reading TIFF metadata...")
print()

with tifffile.TiffFile(tiff_path) as tif:

    page = tif.pages[0]

    print("Image shape:")
    print(page.shape)

    print()
    print("TIFF tags:")
    print("----------------------------")

    for tag in page.tags.values():

        print(
            tag.name,
            ":",
            tag.value
        )

print()
print("Metadata check completed! ✅")