"""Photo mode: zoomed-in, blurred crops of a building photo that open up with each guess.

Level 0 is the first view (tightest zoom, some blur). Each level after that
zooms out and sharpens; the last level is the whole photo. All cropping
happens here on the server, so the full photo never reaches the browser
before the game is over.
"""

from __future__ import annotations

import io
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageFilter

# Every view is shown at the same 4:3 size so the card doesn't jump around.
ASPECT = 4 / 3
OUT_WIDTH = 720
ZOOM_START = 5.0  # level 0 shows 1/5 of the photo's width
BLUR_START = 6.0  # Gaussian blur radius at level 0, in output pixels
BLUR_LEVELS = 3  # blur fades out over the first few levels


def zoom_for(level: int, levels: int) -> float:
    """Zoom factor for a level: ZOOM_START at level 0, easing down to 1 (full photo) at the last level."""
    if levels <= 1:
        return 1.0
    t = min(max(level, 0), levels - 1) / (levels - 1)
    return 1 + (ZOOM_START - 1) * (1 - t) ** 1.6


def blur_for(level: int) -> float:
    return max(0.0, BLUR_START * (1 - level / BLUR_LEVELS))


def crop_box(width: int, height: int, zoom: float, focus: tuple[float, float]) -> tuple[int, int, int, int]:
    """The 4:3 region to show: the largest 4:3 frame in the photo, shrunk by `zoom` around `focus`.

    `focus` is a point as fractions of the photo's width and height. The box is
    shifted, never shrunk, to stay inside the photo.
    """
    if width / height > ASPECT:
        base_w, base_h = height * ASPECT, float(height)
    else:
        base_w, base_h = float(width), width / ASPECT
    w, h = base_w / zoom, base_h / zoom
    cx, cy = focus[0] * width, focus[1] * height
    left = min(max(cx - w / 2, 0), width - w)
    top = min(max(cy - h / 2, 0), height - h)
    return round(left), round(top), round(left + w), round(top + h)


def render(path: Path, level: int, levels: int, focus: tuple[float, float] = (0.5, 0.5)) -> bytes:
    """JPEG bytes for one level of one photo."""
    return _render(str(path), path.stat().st_mtime, level, levels, focus)


@lru_cache(maxsize=256)
def _render(path: str, _mtime: float, level: int, levels: int, focus: tuple[float, float]) -> bytes:
    with Image.open(path) as img:
        img = img.convert("RGB")
        box = crop_box(img.width, img.height, zoom_for(level, levels), focus)
        out = img.crop(box).resize((OUT_WIDTH, round(OUT_WIDTH / ASPECT)), Image.Resampling.LANCZOS)
    radius = blur_for(level)
    if radius > 0:
        out = out.filter(ImageFilter.GaussianBlur(radius))
    buf = io.BytesIO()
    out.save(buf, "JPEG", quality=82, optimize=True)
    return buf.getvalue()
