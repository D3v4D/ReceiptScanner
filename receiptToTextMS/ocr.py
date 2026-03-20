# Disable known unstable CPU execution paths for some Paddle/PaddleOCR combos.
import os
os.environ.setdefault("FLAGS_use_mkldnn", "0")
os.environ.setdefault("FLAGS_enable_pir_api", "0")

from paddleocr import PaddleOCR
import cv2
import numpy as np


ROTATIONS = {
    0: None,
    90: cv2.ROTATE_90_CLOCKWISE,
    180: cv2.ROTATE_180,
    270: cv2.ROTATE_90_COUNTERCLOCKWISE,
}


def _validate_paddle_runtime():
    import paddle

    if not hasattr(paddle, "device"):
        raise RuntimeError(
            "Invalid `paddle` module detected (missing `device`). "
            "This usually means the wrong package is installed. "
            "Uninstall `paddle` and install `paddlepaddle` in the active env."
        )


def _init_ocr_engine():
    _validate_paddle_runtime()
    preferred_lang = os.getenv("OCR_LANG", "en")
    candidates = [preferred_lang, "en"] if preferred_lang != "en" else ["en"]

    last_error = None
    for lang in candidates:
        try:
            # Enable angle classifier so OCR can better handle rotated text.
            return PaddleOCR(use_angle_cls=True, lang=lang)
        except Exception as exc:
            last_error = exc
            print(f"[OCR] Failed to initialize lang='{lang}': {exc}")

    raise RuntimeError(f"Could not initialize PaddleOCR with langs {candidates}: {last_error}")


# Reuse a single OCR model instance for all calls.
OCR_ENGINE = _init_ocr_engine()


def _normalize_entries(result):
    """Normalize PaddleOCR outputs into [{'text','confidence','box'}, ...]."""
    entries = []

    def add_entry(text, conf, box):
        if text is None:
            return
        entries.append({
            "text": str(text),
            "confidence": float(conf) if conf is not None else 0.0,
            "box": box,
        })

    def parse_dict(d):
        # Newer PaddleOCR style: batched arrays.
        texts = d.get("rec_texts") or d.get("texts")
        scores = d.get("rec_scores") or d.get("scores")
        boxes = d.get("rec_polys") or d.get("dt_polys") or d.get("boxes")
        if isinstance(texts, list):
            for i, text in enumerate(texts):
                conf = scores[i] if isinstance(scores, list) and i < len(scores) else None
                box = boxes[i] if isinstance(boxes, list) and i < len(boxes) else None
                add_entry(text, conf, box)

        # Some variants nest line results under `res`.
        rows = d.get("res")
        if isinstance(rows, list):
            for row in rows:
                if not isinstance(row, dict):
                    continue
                text = row.get("text") or row.get("rec_text")
                conf = row.get("confidence") if "confidence" in row else row.get("score")
                box = row.get("box") or row.get("poly") or row.get("bbox")
                add_entry(text, conf, box)

    if result is None:
        return entries

    if isinstance(result, list):
        for item in result:
            # Legacy PaddleOCR style: list of [box, (text, conf)] lines.
            if isinstance(item, list):
                for maybe_line in item:
                    try:
                        box, text_conf = maybe_line
                        text, conf = text_conf
                        add_entry(text, conf, box)
                    except Exception:
                        continue
            elif isinstance(item, dict):
                parse_dict(item)

    elif isinstance(result, dict):
        parse_dict(result)

    return entries


def _avg_confidence(result):
    entries = _normalize_entries(result)
    confs = [e["confidence"] for e in entries]
    return float(np.mean(confs)) if confs else 0.0


def _load_image(image_source):
    if isinstance(image_source, np.ndarray):
        return image_source.copy()
    if isinstance(image_source, str):
        img = cv2.imread(image_source)
        if img is None:
            raise ValueError(f"Could not read image from path: {image_source}")
        return img
    raise TypeError("image_source must be a file path (str) or a numpy ndarray")


def _score_result(result):
    """Composite quality score for orientation selection.

    Char coverage is the primary signal, with text count as secondary and
    confidence as a tiebreaker.
    """
    entries = _normalize_entries(result)
    if not entries:
        return -1e9, 0, 0, 0.0

    avg_conf = float(np.mean([e["confidence"] for e in entries]))
    text_count = len(entries)
    char_count = sum(len(e["text"].strip()) for e in entries)

    # Prioritize richest textual content; confidence only refines ties.
    score = (char_count * 3.0) + (text_count * 8.0) + (avg_conf * 10.0)
    return score, text_count, char_count, avg_conf


def extract_text(image_source):
    img = _load_image(image_source)

    best_result = None
    best_img = None
    best_score = -1e9
    best_degrees = None
    last_error = None

    for degrees, rotation_code in ROTATIONS.items():
        rotated = cv2.rotate(img, rotation_code) if rotation_code is not None else img.copy()
        try:
            result = OCR_ENGINE.ocr(rotated)
        except Exception as exc:
            last_error = exc
            print(f"[OCR] rotation={degrees} failed: {exc}")
            continue

        score, text_count, char_count, avg_conf = _score_result(result)
        print(
            f"[OCR] rotation={degrees} score={score:.2f} "
            f"avg_conf={avg_conf:.3f} text_count={text_count} char_count={char_count}"
        )
        if score > best_score:
            best_score = score
            best_result = result
            best_img = rotated
            best_degrees = degrees

    if best_result is None:
        msg = str(last_error)
        if "ConvertPirAttribute2RuntimeAttribute" in msg or "onednn_instruction" in msg:
            raise RuntimeError(
                "Paddle oneDNN/PIR runtime failure detected. "
                "Try restarting the API with FLAGS_use_mkldnn=0 and FLAGS_enable_pir_api=0, "
                "or use a different Paddle/PaddleOCR version pair. "
                f"Original error: {last_error}"
            )
        raise RuntimeError(f"OCR failed on all rotations: {last_error}")

    print(f"[OCR] selected rotation={best_degrees} with score={best_score:.2f}")

    normalized = _normalize_entries(best_result)
    texts = [item["text"] for item in normalized]
    text_with_boxes = normalized

    return "\n".join(texts), best_result, best_img, text_with_boxes
