"""
validator.py
Post-extraction validation and cleanup.
"""

import re
import logging
from typing import Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)


def validate_id_number(id_number: str, id_type: str) -> bool:
    """Validate ID number based on ID type."""
    if not id_number:
        return False
        
    if id_type == 'aadhaar':
        digits = re.sub(r'\D', '', id_number)
        return len(digits) == 12
    elif id_type == 'pan':
        return bool(re.match(r'^[A-Z]{5}\d{4}[A-Z]$', id_number, re.IGNORECASE))
    elif id_type == 'voter':
        return bool(re.match(r'^[A-Z]{3}\d{7}$', id_number, re.IGNORECASE))
    
    return len(id_number.strip()) >= 5  # generic fallback


def validate_dob(dob: str) -> bool:
    """Validate DOB is a real date and not in the future."""
    if not dob:
        return False
    # Year-only
    if re.match(r'^\d{4}$', dob):
        y = int(dob)
        return 1900 <= y <= datetime.now().year
    # DD/MM/YYYY
    try:
        parts = dob.split('/')
        if len(parts) != 3:
            return False
        d, m, y = int(parts[0]), int(parts[1]), int(parts[2])
        dt = datetime(y, m, d)
        return dt < datetime.now() and y >= 1900
    except (ValueError, IndexError):
        return False


def validate_name(name: str) -> bool:
    """Name must have at least 2 alpha chars and no suspicious patterns."""
    if not name or len(name.strip()) < 2:
        return False
    alpha_count = sum(c.isalpha() for c in name)
    return alpha_count >= 2


def sanitize(extracted: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate each field and clear invalid ones.
    Returns cleaned dict with added 'warnings' list.
    """
    warnings = []

    # Name
    if extracted.get('name') and not validate_name(extracted['name']):
        logger.warning(f"Invalid name discarded: {extracted['name']!r}")
        warnings.append('name_invalid')
        extracted['name'] = None

    # ID Number
    id_type = extracted.get('id_type', 'aadhaar')
    if extracted.get('id_number') and not validate_id_number(extracted['id_number'], id_type):
        logger.warning(f"Invalid ID Number discarded: {extracted['id_number']!r} for type {id_type}")
        warnings.append('id_number_invalid')
        extracted['id_number'] = None

    # DOB
    if extracted.get('dob') and not validate_dob(extracted['dob']):
        logger.warning(f"Invalid DOB discarded: {extracted['dob']!r}")
        warnings.append('dob_invalid')
        extracted['dob'] = None
        extracted['age'] = None

    # Gender normalization
    if extracted.get('gender') not in ('Male', 'Female'):
        extracted['gender'] = None

    # Address minimum length
    if extracted.get('address') and len(extracted['address'].strip()) < 10:
        extracted['address'] = None

    # Trim all string fields
    for field in ('name', 'dob', 'age', 'gender', 'id_number', 'address'):
        if isinstance(extracted.get(field), str):
            extracted[field] = extracted[field].strip()

    extracted['warnings'] = warnings
    return extracted


def confidence_report(extracted: Dict[str, Any]) -> Dict[str, Any]:
    """
    Add a 'field_confidence' dict indicating how reliable each field is.
    Based on presence, validation, and OCR confidence.
    """
    ocr_conf = extracted.get('ocr_confidence', 0.0)
    id_type = extracted.get('id_type', 'aadhaar')
    fields = ['name', 'dob', 'gender', 'id_number', 'address']

    field_conf = {}
    for f in fields:
        val = extracted.get(f, '')
        if not val:
            field_conf[f] = 0.0
        else:
            # Base score from OCR confidence, boosted if field is complete
            base = ocr_conf
            if f == 'id_number' and validate_id_number(val, id_type):
                base = min(1.0, base + 0.2)
            if f == 'dob' and validate_dob(val):
                base = min(1.0, base + 0.1)
            field_conf[f] = round(base, 3)

    extracted['field_confidence'] = field_conf

    # Overall extraction score
    filled = sum(1 for f in fields if extracted.get(f))
    extracted['extraction_score'] = round(filled / len(fields), 2)

    return extracted

def apply_strict_rules(extracted: Dict[str, Any], threshold: float = 0.85) -> Dict[str, Any]:
    """
    Enforce confidence thresholds.
    - ID Number: Strict (0.85) because errors here are critical.
    - Others: More lenient (0.70) to allow for noisy/mobile scans.
    """
    field_conf = extracted.get('field_confidence', {})
    
    thresholds = {
        'id_number': 0.85,
        'dob':       0.75,
        'name':      0.70,
        'gender':    0.60,
        'address':   0.60
    }
    
    # Iterate over all primary fields
    for field in ['name', 'dob', 'gender', 'id_number', 'address']:
        val = extracted.get(field)
        conf = field_conf.get(field, 0.0)
        t = thresholds.get(field, threshold)
        
        # If no value or below confidence -> enforce None
        if not val or conf < t:
            if val:
                logger.warning(f"Field '{field}' dropped due to low confidence ({conf} < {t})")
            extracted[field] = None
    
    # Also clean age if dob is removed
    if not extracted.get('dob'):
        extracted['age'] = None
        
    return extracted

