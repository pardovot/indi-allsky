"""
Focus quality measurements for the focus page.

Variance of the Laplacian is sensitive to framing and sky brightness, so its
absolute value means little on its own.  Half flux diameter is measured from the
detected stars instead and falls as focus improves, which makes it comparable
between frames.
"""

import cv2
import numpy
import logging


logger = logging.getLogger('indi_allsky')


# Half width of the box measured around each star.  A box that is too small
# truncates a badly defocused star and understates how far out of focus it is.
HFD_WINDOW = 14

# stars this bright have flat tops and would report a inflated diameter
SATURATION_LEVEL = 250

# measuring every star in a wide field costs more than it adds
HFD_MAX_SAMPLES = 60


def blur_score(image_roi):
    """Variance of the Laplacian.  Higher is sharper."""
    return float(cv2.Laplacian(image_roi, cv2.CV_32F).var())


def half_flux_diameter(grey_roi, star_points, point_offset=0):
    """
    Median half flux diameter, in pixels, over the detected stars.  Lower is
    sharper.  star_points are the detection coordinates, offset by point_offset
    to reach the centre of the star.  Returns (hfd, sample_count) with hfd None
    when no star could be measured.
    """
    if not len(star_points):
        return None, 0


    image_height, image_width = grey_roi.shape[:2]

    # distance of every pixel in the measuring box from its centre, reused per star
    axis = numpy.arange(-HFD_WINDOW, HFD_WINDOW + 1, dtype=numpy.float32)
    offset_y, offset_x = numpy.meshgrid(axis, axis, indexing='ij')

    data = grey_roi.astype(numpy.float32)

    diameters = list()

    for point in star_points[:HFD_MAX_SAMPLES]:
        center_x = int(point[0]) + point_offset
        center_y = int(point[1]) + point_offset

        x1 = center_x - HFD_WINDOW
        y1 = center_y - HFD_WINDOW
        x2 = center_x + HFD_WINDOW + 1
        y2 = center_y + HFD_WINDOW + 1

        if x1 < 0 or y1 < 0 or x2 > image_width or y2 > image_height:
            # a clipped box would bias the measurement low
            continue


        window = data[y1:y2, x1:x2]

        if window.max() >= SATURATION_LEVEL:
            continue


        # the border of the box is sky, not star
        background = float(numpy.median(window))
        flux = numpy.clip(window - background, 0, None)

        total_flux = float(flux.sum())
        if total_flux <= 0:
            continue


        # re-centre on the flux so a detection that landed off centre does not
        # report a larger diameter than the star actually has
        centroid_x = float((flux * offset_x).sum()) / total_flux
        centroid_y = float((flux * offset_y).sum()) / total_flux

        distance = numpy.sqrt(
            numpy.square(offset_x - centroid_x) + numpy.square(offset_y - centroid_y)
        )

        diameters.append(2.0 * float((flux * distance).sum()) / total_flux)


    if not diameters:
        return None, 0


    return float(numpy.median(diameters)), len(diameters)


def exposure_stats(grey_roi, bins=64):
    """
    Luminance histogram and clipping figures for the region being viewed.
    """
    histogram = cv2.calcHist([grey_roi], [0], None, [bins], [0, 256])
    histogram = [int(x) for x in histogram.flatten()]

    pixel_count = int(grey_roi.size)

    # 0 and 255 carry no detail, so they are what the user needs warning about
    clipped_low = int(numpy.count_nonzero(grey_roi == 0))
    clipped_high = int(numpy.count_nonzero(grey_roi >= 254))

    return {
        'histogram'         : histogram,
        'mean'              : float(grey_roi.mean()),
        'max'               : int(grey_roi.max()),
        'clipped_low_pct'   : 100.0 * clipped_low / pixel_count,
        'clipped_high_pct'  : 100.0 * clipped_high / pixel_count,
    }
