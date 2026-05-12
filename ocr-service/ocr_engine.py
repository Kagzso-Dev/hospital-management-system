"""
ocr_engine.py
PaddleOCR wrapper with multi-pass strategy and confidence filtering.
"""

import logging
import numpy as np
import cv2
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Lazy-loaded PaddleOCR instance (heavy model, load once)
_ocr_instance: Optional[Any] = None


def get_ocr() -> Any:
    """Singleton: initialize PaddleOCR once."""
    global _ocr_instance
    if _ocr_instance is None:
        try:
            from paddleocr import PaddleOCR
            _ocr_instance = PaddleOCR(
                use_angle_cls=True,    # Auto angle classification
                lang='en',
                use_gpu=False,
                show_log=False,
                det_db_thresh=0.3,     # Detection threshold (lower = more boxes)
                det_db_box_thresh=0.5,
                rec_batch_num=8,
                max_text_length=64,
                rec_algorithm='SVTR_LCNet',
            )
            logger.info("PaddleOCR initialized successfully")
        except ImportError:
            raise RuntimeError(
                "PaddleOCR not installed. Run: pip install paddleocr paddlepaddle"
            )
    return _ocr_instance


def _run_single_pass(ocr, img: np.ndarray, min_confidence: float) -> List[Dict]:
    """Run one OCR pass and return structured word results."""
    result = ocr.ocr(img, cls=True)
    words = []

    if not result or not result[0]:
        return words

    for line in result[0]:
        if not line:
            continue
        box, (text, conf) = line
        text = (text or '').strip()
        if not text or conf < min_confidence:
            continue

        # Compute bounding box values
        pts = np.array(box, dtype=np.int32)
        x, y, w, h = cv2.boundingRect(pts)

        words.append({
            'text': text,
            'confidence': round(float(conf), 4),
            'box': [int(x), int(y), int(w), int(h)],      # x, y, w, h
            'points': [[int(p[0]), int(p[1])] for p in box],  # raw quad
            'center_y': int(y + h / 2),
            'center_x': int(x + w / 2),
        })

    return words


def group_into_lines(words: List[Dict], line_threshold: int = 15) -> List[List[Dict]]:
    """
    Group word boxes into text lines by proximity of their vertical centers.
    Returns list of lines, each line sorted left-to-right.
    """
    if not words:
        return []

    sorted_words = sorted(words, key=lambda w: w['center_y'])
    lines: List[List[Dict]] = []
    current_line: List[Dict] = [sorted_words[0]]

    for word in sorted_words[1:]:
        last_y = current_line[-1]['center_y']
        if abs(word['center_y'] - last_y) <= line_threshold:
            current_line.append(word)
        else:
            lines.append(sorted(current_line, key=lambda w: w['center_x']))
            current_line = [word]

    lines.append(sorted(current_line, key=lambda w: w['center_x']))
    return lines


def run_ocr(
    img: np.ndarray,
    min_confidence: float = 0.5,
    low_conf_repass: bool = True,
) -> Dict[str, Any]:
    """
    Run OCR with optional second pass on low-confidence images.

    Args:
        img            : BGR numpy array
        min_confidence : Minimum confidence to keep a word
        low_conf_repass: If avg confidence < 0.7, run a second pass on
                         contrast-enhanced version

    Returns:
        {
            words    : flat list of word dicts
            lines    : grouped text lines
            full_text: joined plain text
            avg_conf : average confidence score
            passes   : number of OCR passes performed
        }
    """
    ocr = get_ocr()
    passes = 1

    words = _run_single_pass(ocr, img, min_confidence)

    # ── Second pass if confidence is low ──────────────────────────────────────
    if low_conf_repass and words:
        avg_conf = sum(w['confidence'] for w in words) / len(words)
        if avg_conf < 0.70:
            logger.info(f"Low confidence ({avg_conf:.2f}), running second OCR pass")
            # Invert and re-threshold for second pass
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
            _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            img2 = cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)
            words2 = _run_single_pass(ocr, img2, min_confidence)

            # Merge: keep words from whichever pass has higher confidence per line
            if words2:
                existing_texts = {w['text'].lower() for w in words}
                for w in words2:
                    if w['text'].lower() not in existing_texts:
                        words.append(w)
                passes = 2

    lines = group_into_lines(words)

    # Build full plain text from grouped lines
    line_texts = [' '.join(w['text'] for w in line) for line in lines]
    full_text = '\n'.join(line_texts)

    avg_conf = (
        sum(w['confidence'] for w in words) / len(words) if words else 0.0
    )

    return {
        'words':     words,
        'lines':     lines,
        'line_texts': line_texts,
        'full_text': full_text,
        'avg_conf':  round(avg_conf, 4),
        'passes':    passes,
        'word_count': len(words),
    }


def run_ocr_on_region(
    img: np.ndarray,
    x: int, y: int, w: int, h: int,
    padding: int = 10,
    min_confidence: float = 0.5,
) -> Dict[str, Any]:
    """
    Crop a region from the image and run OCR on it.
    Useful for extracting specific zones (e.g., bottom half for address).
    """
    ih, iw = img.shape[:2]
    x1 = max(0, x - padding)
    y1 = max(0, y - padding)
    x2 = min(iw, x + w + padding)
    y2 = min(ih, y + h + padding)

    region = img[y1:y2, x1:x2]
    if region.size == 0:
        return {'words': [], 'lines': [], 'full_text': '', 'avg_conf': 0.0, 'passes': 0}

    result = run_ocr(region, min_confidence=min_confidence, low_conf_repass=False)

    # Adjust coordinates back to full-image space
    for word in result['words']:
        bx, by, bw, bh = word['box']
        word['box'] = [bx + x1, by + y1, bw, bh]

    return result
