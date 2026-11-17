import io

import pytest
from PIL import Image

from app.photo import ASPECT, OUT_WIDTH, blur_for, crop_box, render, zoom_for


def test_zoom_eases_from_start_to_full_photo():
    zooms = [zoom_for(level, 8) for level in range(8)]
    assert zooms[0] == pytest.approx(5.0)
    assert zooms[-1] == 1.0
    assert zooms == sorted(zooms, reverse=True)


def test_levels_past_the_end_show_the_full_photo():
    assert zoom_for(20, 8) == 1.0 and zoom_for(-3, 8) == pytest.approx(5.0)


def test_blur_fades_out():
    assert blur_for(0) > blur_for(1) > blur_for(2) > 0
    assert blur_for(3) == 0 and blur_for(7) == 0


@pytest.mark.parametrize("size", [(1600, 900), (900, 1600), (1200, 900)])
def test_crop_is_4_by_3_and_inside_the_photo(size):
    w, h = size
    for zoom in (1, 2.5, 5):
        for focus in ((0.5, 0.5), (0, 0), (1, 1), (0.9, 0.1)):
            l, t, r, b = crop_box(w, h, zoom, focus)
            assert 0 <= l < r <= w and 0 <= t < b <= h
            assert (r - l) / (b - t) == pytest.approx(ASPECT, rel=0.01)


def test_full_zoom_uses_the_whole_width_of_a_tall_photo():
    assert crop_box(900, 1600, 1, (0.5, 0.5)) == (0, 462, 900, 1138)


def test_render_outputs_a_jpeg_of_fixed_size(tmp_path):
    path = tmp_path / "p.jpg"
    Image.new("RGB", (1000, 700), "purple").save(path)
    for level in (0, 7):
        img = Image.open(io.BytesIO(render(path, level, 8)))
        assert img.format == "JPEG" and img.width == OUT_WIDTH
