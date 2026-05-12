"""
main.py
FastAPI OCR microservice — production-ready entry point.
Port: 5001 (Node.js backend proxies /api/ocr → this service)
"""

import io
import logging
import time
import traceback
from contextlib import asynccontextmanager

import cv2
import numpy as np
import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from preprocessor import preprocess
from ocr_engine import run_ocr, get_ocr
from extractor import extract_fields
from template_mapper import detect_id_type_fast, extract_from_templates
from validator import sanitize, confidence_report, apply_strict_rules

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
logger = logging.getLogger(__name__)


# ── Lifespan: warm up PaddleOCR on startup ────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Warming up PaddleOCR model (first run downloads ~200MB)...")
    try:
        get_ocr()
        logger.info("OCR model ready ✓")
    except Exception as e:
        logger.error(f"OCR model initialization failed: {e}")
    yield
    logger.info("OCR service shutting down")


# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Hospital ID Card OCR Service",
    description="Offline PaddleOCR-based ID card data extraction",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Locked to localhost in production
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "service": "ocr-service", "version": "1.0.0"}


# ── Main extraction endpoint ──────────────────────────────────────────────────
@app.post("/extract")
async def extract_id_card(file: UploadFile = File(...)):
    """
    POST /extract
    Accepts: multipart/form-data with field 'file' (image)
    Returns: JSON with extracted fields
    """
    # Validate file type
    allowed = {'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/bmp'}
    ct = file.content_type or ''
    if ct not in allowed and not ct.startswith('image/'):
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {ct}. Send JPEG, PNG, WebP, or BMP."
        )

    # Validate size (max 10 MB)
    raw = await file.read()
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large (max 10 MB)")
    if len(raw) < 1000:
        raise HTTPException(status_code=400, detail="Image too small or empty")

    t_start = time.perf_counter()

    try:
        # ── Step 1: Preprocess (Resize, Denoise, Orientation Fix) ──────────
        img_color, img_gray, rotation_angle = preprocess(raw)
        logger.info(f"Preprocessed: shape={img_color.shape}, rotation={rotation_angle:.1f}°")

        # ── Step 2: ID Type Detection (Top 35% of image) ───────────────────
        card_type = detect_id_type_fast(img_color)

        # ── Step 3: Template Mapping (ROI Extraction) ──────────────────────
        logger.info(f"Running Template Extraction for: {card_type}")
        template_data = extract_from_templates(img_color, card_type)
        
        extracted = sanitize(template_data)
        extracted = confidence_report(extracted)

        ocr_passes = 4  # ID type + 3 regions roughly
        word_count = 0  # ROI doesn't return full word count easily
        
        # Check if template extraction was successful enough
        # We consider it successful if extraction_score > 0.6 (e.g., found Name, DOB, Aadhaar)
        # OR if we are confident in what we found.
        
        if extracted['extraction_score'] < 0.6 or extracted.get('template_confidence', 0) < 0.7:
            logger.info(f"Template extraction incomplete (score={extracted['extraction_score']}). Triggering Full OCR Fallback...")
            
            # ── Step 4: Fallback (Full OCR) ────────────────────────────────
            ocr_result = run_ocr(img_color, min_confidence=0.45, low_conf_repass=True)
            ocr_passes += ocr_result['passes']
            word_count = ocr_result['word_count']
            
            if word_count < 5:
                logger.info("Sparse OCR on color image, retrying on grayscale")
                gray_bgr = cv2.cvtColor(img_gray, cv2.COLOR_GRAY2BGR)
                ocr_result2 = run_ocr(gray_bgr, min_confidence=0.40, low_conf_repass=False)
                if ocr_result2['word_count'] > word_count:
                    ocr_result = ocr_result2
                    word_count = ocr_result['word_count']
                    ocr_passes += 1

            if word_count == 0:
                return JSONResponse(
                    status_code=422,
                    content={
                        "success": False,
                        "error": "No text detected. Please use a clearer image.",
                        "data": _empty_result(),
                    }
                )

            fallback_data = extract_fields(ocr_result)
            fallback_data = sanitize(fallback_data)
            fallback_data = confidence_report(fallback_data)
            
            # Merge: Use Fallback data for any fields that Template missed
            for key in ['name', 'dob', 'age', 'gender', 'id_number', 'address']:
                if not extracted.get(key) and fallback_data.get(key):
                    extracted[key] = fallback_data[key]
            
            # Recalculate score after merge
            extracted = confidence_report(extracted)
            extracted['ocr_confidence'] = fallback_data.get('ocr_confidence', 0.0)
            extracted['id_type'] = fallback_data['id_type']
        else:
            logger.info("Template extraction successful. Skipping Full OCR fallback.")
            extracted['ocr_confidence'] = extracted.get('template_confidence', 0.0)

        # ── Step 5: Enforce Strict Missing Data & Confidence Rules ──────────
        extracted = apply_strict_rules(extracted, threshold=0.85)

        elapsed = round((time.perf_counter() - t_start) * 1000, 1)
        extracted['processing_ms'] = elapsed
        extracted['rotation_corrected'] = round(rotation_angle, 2)

        logger.info(f"Extraction complete in {elapsed}ms — score={extracted['extraction_score']}")

        return JSONResponse(content={
            "success": True,
            "data": {
                "id_type":   extracted.get('id_type'),
                "name":      extracted.get('name'),
                "dob":       extracted.get('dob'),
                "gender":    extracted.get('gender'),
                "id_number": extracted.get('id_number'),
                "address":   extracted.get('address'),
            },
            "meta": {
                "ocr_confidence":     extracted.get('ocr_confidence'),
                "field_confidence":   extracted.get('field_confidence'),
                "extraction_score":   extracted.get('extraction_score'),
                "word_count":         word_count,
                "ocr_passes":         ocr_passes,
                "rotation_corrected": extracted.get('rotation_corrected'),
                "processing_ms":      elapsed,
                "warnings":           extracted.get('warnings', []),
            }
        })

    except ValueError as e:
        logger.error(f"ValueError during extraction: {e}")
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        logger.error(f"Unexpected error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


# ── Debug endpoint: returns raw OCR text (dev only) ───────────────────────────
@app.post("/debug/raw-ocr")
async def raw_ocr(file: UploadFile = File(...)):
    """Returns raw OCR text lines with confidence for debugging."""
    raw = await file.read()
    try:
        img_color, _, _ = preprocess(raw)
        result = run_ocr(img_color, min_confidence=0.3)
        return {
            "full_text": result['full_text'],
            "line_texts": result['line_texts'],
            "words": [
                {"text": w['text'], "conf": w['confidence'], "box": w['box']}
                for w in result['words']
            ],
            "avg_conf": result['avg_conf'],
            "word_count": result['word_count'],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _empty_result() -> dict:
    return {"id_type": None, "name": None, "dob": None, "gender": None, "id_number": None, "address": None}


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5001,
        reload=False,
        workers=1,       # PaddleOCR is NOT thread-safe across workers
        log_level="info",
    )
