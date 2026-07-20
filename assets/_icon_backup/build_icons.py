"""
Rebuilds the launcher icons from the high-res DEALNUX wordmark.

The shipped icon.png was the horizontal wordmark centred in a 4167px square:
it filled 59% of the width but only 8% of the height, so at launcher size
(48-72px) the text collapsed into an unreadable smudge. adaptive-icon.png was
worse - a 48x48 source that Android upscaled 20x.

This crops DEAL and NUX from the original and stacks them into a square
lockup, which uses the space a launcher icon actually has.

Run from the assets/ directory:  python _icon_backup/build_icons.py
"""

from PIL import Image

SRC = "_icon_backup/icon.png"          # untouched original
BLUE_BOX = (860, 1916, 2192, 2244)     # "DEAL"
YELLOW_BOX = (2248, 1916, 3304, 2248)  # "NUX"
WHITE = (255, 255, 255, 255)


def tight(img, box):
    """Crop to box, then shrink to the exact ink bounds."""
    part = img.crop(box)
    # getbbox() works on the alpha of a difference against white
    bg = Image.new("RGBA", part.size, WHITE)
    from PIL import ImageChops
    diff = ImageChops.difference(part.convert("RGB"), bg.convert("RGB"))
    bbox = diff.getbbox()
    return part.crop(bbox) if bbox else part


def build(size, target_width_ratio, out_path):
    """Compose the stacked lockup on a white square of `size`."""
    src = Image.open(SRC).convert("RGBA")
    deal = tight(src, BLUE_BOX)
    nux = tight(src, YELLOW_BOX)

    # One scale factor for both words so the type keeps its proportions.
    target_w = int(size * target_width_ratio)
    scale = target_w / deal.width

    deal = deal.resize((target_w, max(1, round(deal.height * scale))), Image.LANCZOS)
    nux = nux.resize(
        (max(1, round(nux.width * scale)), max(1, round(nux.height * scale))),
        Image.LANCZOS,
    )

    gap = round(deal.height * 0.22)
    block_h = deal.height + gap + nux.height

    canvas = Image.new("RGBA", (size, size), WHITE)
    y = (size - block_h) // 2
    canvas.paste(deal, ((size - deal.width) // 2, y), deal)
    canvas.paste(nux, ((size - nux.width) // 2, y + deal.height + gap), nux)

    canvas.convert("RGB").save(out_path, "PNG", optimize=True)
    print(f"{out_path:22} {size}x{size}  block={block_h}px ({block_h/size:.0%} of height)")


if __name__ == "__main__":
    # iOS / general icon: fills the square, small safe margin.
    build(1024, 0.78, "icon.png")

    # Android adaptive foreground: everything must sit inside the centre 66%,
    # because the launcher masks and can zoom the outer edge away.
    build(1024, 0.52, "adaptive-icon.png")

    # Web favicon.
    build(196, 0.80, "favicon.png")
