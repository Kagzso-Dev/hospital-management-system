"""
extractor.py
Structured field extraction from OCR output for Indian ID cards.
Supports: Aadhaar, PAN, Voter ID, Driving License.
"""

import re
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)

# ── Regex patterns ─────────────────────────────────────────────────────────────

# Aadhaar: XXXX XXXX XXXX or XXXXXXXXXXXX (12 digits)
RE_AADHAAR = re.compile(r'\b(\d{4}[\s\-]?\d{4}[\s\-]?\d{4})\b')

# PAN: 5 letters, 4 digits, 1 letter
RE_PAN = re.compile(r'\b([A-Z]{5}\d{4}[A-Z])\b', re.IGNORECASE)

# Voter ID (EPIC): 3 letters, 7 digits
RE_VOTER = re.compile(r'\b([A-Z]{3}\d{7})\b', re.IGNORECASE)

# DOB patterns: DD/MM/YYYY, DD-MM-YYYY, YYYY, DD Month YYYY
RE_DOB_DMY  = re.compile(r'\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b')
RE_DOB_YOB  = re.compile(r'\b(?:year\s*of\s*birth|yob)\s*[:\s]+(\d{4})\b', re.IGNORECASE)
RE_DOB_TEXT = re.compile(
    r'\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|'
    r'Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})\b',
    re.IGNORECASE
)

# Gender
RE_GENDER_MALE   = re.compile(r'\b(male|MALE|पुरुष|M)\b')
RE_GENDER_FEMALE = re.compile(r'\b(female|FEMALE|महिला|F)\b')

# PIN code (6 digits, used to anchor address extraction)
RE_PINCODE = re.compile(r'\b(\d{6})\b')

# Skip lines that are not useful
NOISE_PATTERNS = [
    re.compile(p, re.IGNORECASE) for p in [
        r'^government\s+of\s+india',
        r'^भारत\s+सरकार',
        r'^unique\s+identification',
        r'^uidai',
        r'^www\.',
        r'^help\s*line',
        r'^enrol',
        r'^\d{10}$',        # phone numbers
        r'^vid\s*:',
        r'^mera\s+aadhaar',
        r'^income\s*tax',
        r'^permanent\s*account',
        r'^election\s*commission',
        r'^transport',
        r'^driving\s*licen',
        r'^visit\s*us',
        r'^signature',
    ]
]

MONTH_MAP = {
    'jan': 1, 'january': 1, 'feb': 2, 'february': 2,
    'mar': 3, 'march': 3, 'apr': 4, 'april': 4,
    'may': 5, 'jun': 6, 'june': 6, 'jul': 7, 'july': 7,
    'aug': 8, 'august': 8, 'sep': 9, 'september': 9,
    'oct': 10, 'october': 10, 'nov': 11, 'november': 11,
    'dec': 12, 'december': 12,
}


# ── Card type detection ────────────────────────────────────────────────────────

def detect_card_type(text: str) -> str:
    t = text.lower()
    if any(kw in t for kw in ['income tax', 'permanent account', 'pan ']):
        return 'pan'
    if any(kw in t for kw in ['election commission', 'epic no', 'voter']):
        return 'voter'
    if any(kw in t for kw in ['driving licen', 'transport dep', 'dl no']):
        return 'dl'
    if any(kw in t for kw in ['aadhaar', 'uidai', 'mera aadhaar']) or RE_AADHAAR.search(text):
        return 'aadhaar'
    return 'aadhaar'   # default


# ── Individual field extractors ───────────────────────────────────────────────

def extract_id_number(text: str, id_type: str) -> Optional[str]:
    """Extract ID number based on detected ID type."""
    if id_type == 'aadhaar':
        matches = RE_AADHAAR.findall(text)
        for m in matches:
            digits = re.sub(r'\D', '', m)
            if len(digits) == 12:
                return f"{digits[:4]} {digits[4:8]} {digits[8:]}"
    elif id_type == 'pan':
        match = RE_PAN.search(text)
        if match:
            return match.group(1).upper()
    elif id_type == 'voter':
        match = RE_VOTER.search(text)
        if match:
            return match.group(1).upper()
    return None


def extract_dob(text: str) -> Optional[str]:
    """Extract date of birth and normalize to DD/MM/YYYY."""
    # Try labeled DOB first
    labeled = re.search(
        r'(?:dob|d\.o\.b\.?|date\s*of\s*birth)\s*[:\s]*'
        r'(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})',
        text, re.IGNORECASE
    )
    if labeled:
        d, m, y = labeled.group(1), labeled.group(2), labeled.group(3)
        return _validate_format_date(int(d), int(m), int(y))

    # Text month format: 12 Jan 1990
    tm = RE_DOB_TEXT.search(text)
    if tm:
        d = int(tm.group(1))
        mo = MONTH_MAP.get(tm.group(2).lower()[:3])
        y = int(tm.group(3))
        if mo:
            return _validate_format_date(d, mo, y)

    # YOB only
    yob = RE_DOB_YOB.search(text)
    if yob:
        return yob.group(1)   # return year only

    # Any DD/MM/YYYY
    dmy = RE_DOB_DMY.search(text)
    if dmy:
        d, m, y = int(dmy.group(1)), int(dmy.group(2)), int(dmy.group(3))
        return _validate_format_date(d, m, y)

    return None


def _validate_format_date(d: int, m: int, y: int) -> Optional[str]:
    """Validate date components and return DD/MM/YYYY string."""
    try:
        dt = datetime(y, m, d)
        # Reject future dates and impossibly old dates
        now = datetime.now()
        if dt > now or y < 1900:
            return None
        return f"{d:02d}/{m:02d}/{y}"
    except ValueError:
        return None


def _age_from_dob(dob_str: str) -> Optional[str]:
    """Compute age from dob string DD/MM/YYYY."""
    try:
        parts = dob_str.split('/')
        if len(parts) != 3:
            return None
        d, m, y = int(parts[0]), int(parts[1]), int(parts[2])
        today = datetime.today()
        age = today.year - y - ((today.month, today.day) < (m, d))
        return str(age) if 0 < age < 130 else None
    except Exception:
        return None


def extract_gender(text: str) -> Optional[str]:
    """Extract gender from text."""
    # Look for explicit gender/sex label first
    labeled = re.search(
        r'(?:gender|sex|लिंग)\s*[:\s]*(male|female|पुरुष|महिला)',
        text, re.IGNORECASE
    )
    if labeled:
        val = labeled.group(1).lower()
        return 'Female' if val in ('female', 'महिला') else 'Male'

    if RE_GENDER_FEMALE.search(text):
        return 'Female'
    if RE_GENDER_MALE.search(text):
        return 'Male'
    return None


def _is_noise(line: str) -> bool:
    """Return True if a line should be ignored."""
    if not line or len(line.strip()) < 2:
        return True
    for p in NOISE_PATTERNS:
        if p.search(line.strip()):
            return True
    # Mostly digits / special chars
    alpha_ratio = sum(c.isalpha() for c in line) / max(len(line), 1)
    if alpha_ratio < 0.3 and len(line) < 10:
        return True
    return False


def extract_name(line_texts: List[str], card_type: str, full_text: str) -> Optional[str]:
    """
    Extract person's name using card-specific heuristics.

    Strategy:
    - For Aadhaar: first clean alpha line after ignoring headers
    - For PAN: look for lines before father's name
    - For Voter: explicit Name: label
    - Fallback: largest alpha line in top 60% of text
    """
    # Labeled name
    labeled = re.search(
        r'(?:name|नाम)\s*[:\s]+([A-Za-z][A-Za-z\s.\'-]{2,50})',
        full_text, re.IGNORECASE
    )
    if labeled:
        return _clean_name(labeled.group(1))

    # Heuristic: first non-noise, purely alpha line, not a keyword
    SKIP = re.compile(
        r'^(government|india|unique|aadhaar|address|male|female|dob|date|'
        r'year|of|birth|help|www|enrol|vid|भारत|सरकार|income|tax|permanent|'
        r'account|election|commission|transport|driving|voter|card)',
        re.IGNORECASE
    )
    for line in line_texts:
        line = line.strip()
        if _is_noise(line):
            continue
        if SKIP.match(line):
            continue
        if RE_AADHAAR.search(line) or RE_DOB_DMY.search(line) or RE_PINCODE.search(line):
            continue
        # Must be mostly letters
        alpha = sum(c.isalpha() or c == ' ' for c in line) / max(len(line), 1)
        if alpha < 0.7:
            continue
        # Length guard: names are 3-60 chars
        if 3 <= len(line) <= 60:
            return _clean_name(line)

    return None


def _clean_name(raw: str) -> str:
    """Remove non-name characters and normalize whitespace."""
    cleaned = re.sub(r"[^A-Za-z\s.'\-]", '', raw)
    cleaned = re.sub(r'\s{2,}', ' ', cleaned).strip()
    return cleaned if len(cleaned) >= 2 else ''


def extract_address(line_texts: List[str], full_text: str) -> Optional[str]:
    """
    Extract address. Strategy:
    1. Look for Address: label
    2. Look for S/O, W/O, D/O prefix
    3. Use PIN code as anchor — collect lines around it
    """
    # Labeled address
    labeled = re.search(
        r'(?:address|पता|add\.?)\s*[:\s](.+?)(?:\n{2,}|\d{6}|$)',
        full_text, re.IGNORECASE | re.DOTALL
    )
    if labeled:
        return _clean_address(labeled.group(1))

    # S/O, W/O, D/O
    relation = re.search(
        r'(?:[SWD][\/\\][OoH]\.?\s*)(.+?)(?:\d{6}|$)',
        full_text, re.IGNORECASE | re.DOTALL
    )
    if relation:
        return _clean_address(relation.group(1))

    # PIN code anchor: grab the 3 lines around a 6-digit PIN
    pin_match = RE_PINCODE.search(full_text)
    if pin_match:
        pin_pos = pin_match.start()
        # Collect ~200 chars before and after pin
        snippet = full_text[max(0, pin_pos - 200): pin_pos + 50]
        return _clean_address(snippet)

    return None


def _clean_address(raw: str) -> str:
    """Normalize address text."""
    addr = raw.replace('\n', ', ')
    addr = re.sub(r',\s*,', ',', addr)
    addr = re.sub(r'\s{2,}', ' ', addr).strip(' ,')
    return addr[:300] if addr else ''


# ── Main extraction entry point ────────────────────────────────────────────────

def extract_fields(ocr_result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract structured fields from OCR result dict.

    Input: result from ocr_engine.run_ocr()
    Output: {name, dob, age, gender, aadhaar, address, card_type, confidence}
    """
    full_text   = ocr_result.get('full_text', '')
    line_texts  = ocr_result.get('line_texts', [])
    avg_conf    = ocr_result.get('avg_conf', 0.0)

    id_type = detect_card_type(full_text)
    logger.info(f"Detected ID type: {id_type}")

    id_number = extract_id_number(full_text, id_type)
    dob     = extract_dob(full_text)
    age     = _age_from_dob(dob) if dob and '/' in dob else None
    gender  = extract_gender(full_text)
    name    = extract_name(line_texts, id_type, full_text)
    address = extract_address(line_texts, full_text)

    result = {
        'name':      name    or '',
        'dob':       dob     or '',
        'age':       age     or '',
        'gender':    gender  or '',
        'id_number': id_number or '',
        'address':   address or '',
        'id_type':   id_type,
        'ocr_confidence': avg_conf,
        'word_count': ocr_result.get('word_count', 0),
    }

    logger.info(f"Extracted: name={result['name']!r}, dob={result['dob']!r}, "
                f"gender={result['gender']!r}, id_number={bool(result['id_number'])}")
    return result
