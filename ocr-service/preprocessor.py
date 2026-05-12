"""
preprocessor.py
Image preprocessing pipeline for ID card OCR.
Handles: grayscale, denoising, thresholding, resizing, rotation correction.
"""

import cv2
import numpy as np
import math
import logging
from typing import Tuple

logger = logging.getLogger(__name__)


def load_image(source) -> np.ndarray:
    """Load image from filepath or raw bytes."""
    if isinstance(source, (bytes, bytearray)):
        arr = np.frombuffer(source, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    else:
        img = cv2.imread(str(source))
    if img is None:
        raise ValueError("Failed to decode image — unsupported format or corrupted data")
    return img


def resize_to_standard(img: np.ndarray, target_width: int = 1200) -> np.ndarray:
    """Resize image keeping aspect ratio. Upscale small images, cap large ones."""
    h, w = img.shape[:2]
    if w == target_width:
        return img
    scale = target_width / w
    # Avoid upscaling tiny images beyond 2×
    if scale > 2.0:
        scale = 2.0
    new_w = int(w * scale)
    new_h = int(h * scale)
    interp = cv2.INTER_CUBIC if scale > 1 else cv2.INTER_AREA
    return cv2.resize(img, (new_w, new_h), interpolation=interp)


def to_grayscale(img: np.ndarray) -> np.ndarray:
    """Convert BGR to grayscale."""
    if len(img.shape) == 2:
        return img  # already gray
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)


def remove_noise(gray: np.ndarray) -> np.ndarray:
    """Apply bilateral filter — removes noise while preserving edges."""
    return cv2.bilateralFilter(gray, d=9, sigmaColor=75, sigmaSpace=75)


def apply_adaptive_threshold(gray: np.ndarray) -> np.ndarray:
    """Adaptive Gaussian thresholding for variable lighting."""
    return cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        blockSize=31,
        C=10
    )


def detect_rotation_angle(gray: np.ndarray) -> float:
    """
    Detect the skew angle of text lines using Hough Line Transform.
    Returns angle in degrees (negative = counter-clockwise tilt).
    """
    try:
        # Edge detection
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)

        # Hough lines
        lines = cv2.HoughLines(edges, 1, np.pi / 180, threshold=100)
        if lines is None:
            return 0.0

        angles = []
        for line in lines[:50]:  # Limit to top 50 lines
            rho, theta = line[0]
            # Convert to degrees, normalize to [-45, 45]
            angle_deg = math.degrees(theta) - 90
            if -45 < angle_deg < 45:
                angles.append(angle_deg)

        if not angles:
            return 0.0

        # Use median to filter outliers
        median_angle = float(np.median(angles))
        # Only correct if tilt is significant (> 0.5°)
        return median_angle if abs(median_angle) > 0.5 else 0.0

    except Exception as e:
        logger.warning(f"Rotation detection failed: {e}")
        return 0.0


def correct_rotation(img: np.ndarray, angle: float) -> np.ndarray:
    """Rotate image by given angle around center."""
    if abs(angle) < 0.5:
        return img
    h, w = img.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    # Expand canvas to avoid cropping
    cos_a = abs(M[0, 0])
    sin_a = abs(M[0, 1])
    new_w = int(h * sin_a + w * cos_a)
    new_h = int(h * cos_a + w * sin_a)
    M[0, 2] += (new_w - w) / 2
    M[1, 2] += (new_h - h) / 2

    fill = 255 if len(img.shape) == 2 else (255, 255, 255)
    return cv2.warpAffine(img, M, (new_w, new_h),
                          flags=cv2.INTER_CUBIC,
                          borderMode=cv2.BORDER_CONSTANT,
                          borderValue=fill)


def enhance_contrast(gray: np.ndarray) -> np.ndarray:
    """CLAHE (Contrast Limited Adaptive Histogram Equalization)."""
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return clahe.apply(gray)


def sharpen(gray: np.ndarray) -> np.ndarray:
    """Unsharp masking for text sharpening."""
    blurred = cv2.GaussianBlur(gray, (0, 0), sigmaX=3)
    return cv2.addWeighted(gray, 1.5, blurred, -0.5, 0)


def preprocess(source, target_width: int = 1200) -> Tuple[np.ndarray, np.ndarray, float]:
    """
    Full preprocessing pipeline.

    Returns:
        processed_color  : Color image after resize + rotation (for PaddleOCR)
        processed_gray   : Grayscale enhanced image (for debug / region crop)
        rotation_angle   : Detected and applied rotation in degrees
    """
    img = load_image(source)

    # 1. Resize
    img = resize_to_standard(img, target_width)

    # 2. Grayscale
    gray = to_grayscale(img)

    # 3. Detect & correct rotation on grayscale
    angle = detect_rotation_angle(gray)
    if abs(angle) > 0.5:
        img  = correct_rotation(img,  angle)
        gray = correct_rotation(gray, angle)
        logger.info(f"Rotation corrected: {angle:.2f}°")

    # 4. Denoise
    gray_clean = remove_noise(gray)

    # 5. Contrast enhancement
    gray_enhanced = enhance_contrast(gray_clean)

    # 6. Sharpen
    gray_sharp = sharpen(gray_enhanced)

    return img, gray_sharp, angle
