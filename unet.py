import torch
import torch.nn as nn


# ============================================================
# DOUBLE CONVOLUTION BLOCK
# ============================================================

class DoubleConv(nn.Module):

    def __init__(self, in_channels, out_channels):

        super().__init__()

        self.block = nn.Sequential(

            # First convolution
            nn.Conv2d(
                in_channels,
                out_channels,
                kernel_size=3,
                padding=1
            ),

            nn.BatchNorm2d(out_channels),

            nn.ReLU(inplace=True),

            # Second convolution
            nn.Conv2d(
                out_channels,
                out_channels,
                kernel_size=3,
                padding=1
            ),

            nn.BatchNorm2d(out_channels),

            nn.ReLU(inplace=True)
        )

    def forward(self, x):

        return self.block(x)


# ============================================================
# U-NET MODEL
# ============================================================

class UNet(nn.Module):

    def __init__(self):

        super().__init__()


        # ====================================================
        # ENCODER
        # ====================================================

        self.enc1 = DoubleConv(1, 64)

        self.enc2 = DoubleConv(64, 128)

        self.enc3 = DoubleConv(128, 256)

        self.enc4 = DoubleConv(256, 512)


        # Pooling

        self.pool = nn.MaxPool2d(
            kernel_size=2
        )


        # ====================================================
        # BOTTLENECK
        # ====================================================

        self.bottleneck = DoubleConv(
            512,
            1024
        )


        # ====================================================
        # DECODER
        # ====================================================

        self.up4 = nn.ConvTranspose2d(
            1024,
            512,
            kernel_size=2,
            stride=2
        )

        self.dec4 = DoubleConv(
            1024,
            512
        )


        self.up3 = nn.ConvTranspose2d(
            512,
            256,
            kernel_size=2,
            stride=2
        )

        self.dec3 = DoubleConv(
            512,
            256
        )


        self.up2 = nn.ConvTranspose2d(
            256,
            128,
            kernel_size=2,
            stride=2
        )

        self.dec2 = DoubleConv(
            256,
            128
        )


        self.up1 = nn.ConvTranspose2d(
            128,
            64,
            kernel_size=2,
            stride=2
        )

        self.dec1 = DoubleConv(
            128,
            64
        )


        # ====================================================
        # FINAL OUTPUT
        # ====================================================

        self.final = nn.Conv2d(
            64,
            1,
            kernel_size=1
        )


    # ========================================================
    # FORWARD PASS
    # ========================================================

    def forward(self, x):


        # ----------------------------------------------------
        # ENCODER
        # ----------------------------------------------------

        e1 = self.enc1(x)

        e2 = self.enc2(
            self.pool(e1)
        )

        e3 = self.enc3(
            self.pool(e2)
        )

        e4 = self.enc4(
            self.pool(e3)
        )


        # ----------------------------------------------------
        # BOTTLENECK
        # ----------------------------------------------------

        b = self.bottleneck(
            self.pool(e4)
        )


        # ----------------------------------------------------
        # DECODER
        # ----------------------------------------------------

        d4 = self.up4(b)

        d4 = torch.cat(
            [d4, e4],
            dim=1
        )

        d4 = self.dec4(d4)


        d3 = self.up3(d4)

        d3 = torch.cat(
            [d3, e3],
            dim=1
        )

        d3 = self.dec3(d3)


        d2 = self.up2(d3)

        d2 = torch.cat(
            [d2, e2],
            dim=1
        )

        d2 = self.dec2(d2)


        d1 = self.up1(d2)

        d1 = torch.cat(
            [d1, e1],
            dim=1
        )

        d1 = self.dec1(d1)


        # ----------------------------------------------------
        # OUTPUT
        # ----------------------------------------------------

        output = self.final(d1)

        return output


# ============================================================
# TEST U-NET
# ============================================================

if __name__ == "__main__":

    print()
    print("======================================")
    print("        U-NET MODEL TEST")
    print("======================================")
    print()


    # Create model

    model = UNet()


    # Test input

    test_input = torch.randn(
        1,
        1,
        256,
        256
    )


    # Forward pass

    output = model(
        test_input
    )


    # Print shapes

    print(
        "Input shape :",
        test_input.shape
    )

    print(
        "Output shape:",
        output.shape
    )


    # Verify

    assert output.shape == (
        1,
        1,
        256,
        256
    )


    print()
    print("U-NET TEST PASSED! ✅")