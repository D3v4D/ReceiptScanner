from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse, RedirectResponse
import cv2
import numpy as np
import json

app = FastAPI(title="Receipt OCR API")

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/jpg"}


@app.on_event("startup")
def preload_ocr_model():
    import ocr  # noqa: F401


def run_pipeline(image):
    from ocr import extract_text
    from llm import parse_to_json

    ocr_text, _raw_result, _best_img, text_with_boxes = extract_text(image)
    formatted_text, failed_attempts, llm_meta = parse_to_json(ocr_text, text_with_boxes)
    return ocr_text, formatted_text, failed_attempts, llm_meta


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/")
def docs_redirect():
    return RedirectResponse(url="/docs")


@app.post("/extract")
async def extract_receipt(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only PNG and JPEG images are supported.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    image_array = np.frombuffer(content, dtype=np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Could not decode image.")

    try:
        ocr_text, formatted_text, failed_attempts, llm_meta = run_pipeline(image)
    except ModuleNotFoundError as exc:
        # Surface dependency setup errors clearly for API clients.
        raise HTTPException(
            status_code=500,
            detail=(
                "OCR dependency missing. Install Paddle runtime in the active environment "
                "(e.g. `pip install paddlepaddle paddleocr`) and restart the API. "
                f"Original error: {exc}"
            ),
        ) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Processing failed: {exc}") from exc

    payload = {
        "formatted_json": None,  # default to None; will attempt to parse below
        "ocr_text": ocr_text,
        "formatted_text": formatted_text,
        "failed_attempts": failed_attempts,
        "llm_meta": llm_meta,
    }

    try:
        payload["formatted_json"] = json.loads(formatted_text) if formatted_text else None
    except json.JSONDecodeError:
        payload["formatted_json"] = None

    status_code = 422 if llm_meta.get("retry_limit_reached") else 200
    return JSONResponse(content=payload, status_code=status_code)
