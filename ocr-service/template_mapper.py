import cv2
import numpy as np
import logging
from typing import Dict, Any, Optional

from ocr_engine import run_ocr
from extractor import extract_id_number, extract_dob, extract_gender, _clean_name, detect_card_type

logger = logging.getLogger(__name__)

# Dynamic templates (y1, y2, x1, x2 relative to height/width)
TEMPLATES = {
    'aadhaar': {
        'name':    (0.20, 0.40, 0.25, 0.95),  # Right of photo, below header
        'dob':     (0.35, 0.55, 0.25, 0.95),  # Below name
        'gender':  (0.45, 0.65, 0.25, 0.95),  # Below DOB
        'aadhaar': (0.65, 0.95, 0.10, 0.90),  # Bottom center
    },
    'pan': {
        'name':    (0.25, 0.50, 0.05, 0.80),  # Below header
        'fname':   (0.40, 0.65, 0.05, 0.80),  # Father's name
        'dob':     (0.55, 0.75, 0.05, 0.60),  # Bottom left
        'pan_no':  (0.65, 0.90, 0.05, 0.95),  # Bottom 
    },
    'voter': {
        'name':    (0.15, 0.40, 0.30, 0.95),  # Right of photo
        'fname':   (0.30, 0.55, 0.30, 0.95),
        'gender':  (0.45, 0.65, 0.30, 0.95),
        'dob':     (0.50, 0.75, 0.30, 0.95),
    }
}


def detect_id_type_fast(img: np.ndarray) -> str:
    """Run OCR on the top 35% of the image to detect the ID card type."""
    h, w = img.shape[:2]
    top_region = img[0:int(h * 0.35), 0:w]
    result = run_ocr(top_region, min_confidence=0.3, low_conf_repass=False)
    text = result['full_text'].lower()
    
    id_type = detect_card_type(text)
    logger.info(f"Fast ID Detection: {id_type} (from text: {text[:50]}...)")
    return id_type


def _crop_region(img: np.ndarray, template: tuple) -> np.ndarray:
    """Crop image using relative template coordinates."""
    h, w = img.shape[:2]
    y1, y2, x1, x2 = template
    return img[int(h * y1):int(h * y2), int(w * x1):int(w * x2)]


def extract_from_templates(img: np.ndarray, id_type: str) -> Dict[str, Any]:
    """
    Extract fields by cropping regions of interest (ROI) and running OCR
    only on those specific parts. Returns a dictionary of extracted fields.
    """
    if id_type not in TEMPLATES:
        # Fallback if unsupported type for templates
        id_type = 'aadhaar'

    tpl = TEMPLATES[id_type]
    extracted = {
        'name': '', 'dob': '', 'gender': '', 'id_number': '', 
        'address': '', 'id_type': id_type, 'template_confidence': 0.0
    }
    
    confs = []

    # ── Aadhaar Region Extraction ──
    if id_type == 'aadhaar':
        # 1. Aadhaar Number
        num_roi = _crop_region(img, tpl['aadhaar'])
        num_res = run_ocr(num_roi, min_confidence=0.4, low_conf_repass=True)
        id_number = extract_id_number(num_res['full_text'], id_type)
        if id_number:
            extracted['id_number'] = id_number
            confs.append(num_res['avg_conf'])

        # 2. DOB
        dob_roi = _crop_region(img, tpl['dob'])
        dob_res = run_ocr(dob_roi, min_confidence=0.4)
        dob = extract_dob(dob_res['full_text'])
        if dob:
            extracted['dob'] = dob
            confs.append(dob_res['avg_conf'])

        # 3. Gender
        gen_roi = _crop_region(img, tpl['gender'])
        gen_res = run_ocr(gen_roi, min_confidence=0.4)
        gender = extract_gender(gen_res['full_text'])
        if gender:
            extracted['gender'] = gender
            confs.append(gen_res['avg_conf'])

        # 4. Name (requires more care to strip out noise)
        name_roi = _crop_region(img, tpl['name'])
        name_res = run_ocr(name_roi, min_confidence=0.4)
        # Use simple heuristic on the ROI: longest alpha string
        best_name = ''
        for line in name_res['line_texts']:
            clean = _clean_name(line)
            if len(clean) > len(best_name) and not any(k in clean.lower() for k in ['dob', 'year', 'male', 'female', 'government']):
                best_name = clean
        if len(best_name) > 2:
            extracted['name'] = best_name
            confs.append(name_res['avg_conf'])

    # ── PAN Region Extraction ──
    elif id_type == 'pan':
        # DOB
        dob_roi = _crop_region(img, tpl['dob'])
        dob_res = run_ocr(dob_roi, min_confidence=0.4)
        dob = extract_dob(dob_res['full_text'])
        if dob: extracted['dob'] = dob

        # Name
        name_roi = _crop_region(img, tpl['name'])
        name_res = run_ocr(name_roi, min_confidence=0.4)
        best_name = ''
        for line in name_res['line_texts']:
            clean = _clean_name(line)
            if len(clean) > len(best_name) and not any(k in clean.lower() for k in ['income', 'tax', 'department']):
                best_name = clean
        if len(best_name) > 2: extracted['name'] = best_name
        
        # PAN Number
        num_roi = _crop_region(img, tpl['pan_no'])
        num_res = run_ocr(num_roi, min_confidence=0.4)
        id_number = extract_id_number(num_res['full_text'], id_type)
        if id_number: extracted['id_number'] = id_number

    # ── Voter ID Region Extraction ──
    elif id_type == 'voter':
        # DOB
        dob_roi = _crop_region(img, tpl['dob'])
        dob_res = run_ocr(dob_roi, min_confidence=0.4)
        dob = extract_dob(dob_res['full_text'])
        if dob: extracted['dob'] = dob

        # Gender
        gen_roi = _crop_region(img, tpl['gender'])
        gen_res = run_ocr(gen_roi, min_confidence=0.4)
        gender = extract_gender(gen_res['full_text'])
        if gender: extracted['gender'] = gender

        # Name
        name_roi = _crop_region(img, tpl['name'])
        name_res = run_ocr(name_roi, min_confidence=0.4)
        best_name = ''
        for line in name_res['line_texts']:
            clean = _clean_name(line)
            if len(clean) > len(best_name) and not any(k in clean.lower() for k in ['election', 'commission']):
                best_name = clean
        if len(best_name) > 2: extracted['name'] = best_name
        
        # Note: Voter ID number is often at the top. We'd need a template for it.
        # But if we don't have a template for EPIC number, it will fallback to regex on full OCR if needed.

    # Calculate average confidence of the template extractions
    extracted['template_confidence'] = sum(confs) / len(confs) if confs else 0.0
    
    return extracted
