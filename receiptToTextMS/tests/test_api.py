import json

import cv2
import numpy as np
from fastapi.testclient import TestClient

import api


client = TestClient(api.app)


def _make_test_image_bytes():
    image = np.zeros((20, 20, 3), dtype=np.uint8)
    ok, encoded = cv2.imencode(".png", image)
    assert ok
    return encoded.tobytes()


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_extract_rejects_non_image():
    response = client.post(
        "/extract",
        files={"file": ("note.txt", b"hello", "text/plain")},
    )
    assert response.status_code == 400


def test_extract_success(monkeypatch):
    expected = {
        "store": {
            "name": "Demo",
            "address": "Somewhere 1",
            "chain": "DemoChain",
            "tax_number": None,
        },
        "purchase_datetime": "2026-03-10T12:00:00",
        "products": [
            {
                "name": "Milk",
                "quantity": 1,
                "unit": "pc",
                "unit_price": 10,
                "total_price": 10,
            }
        ],
        "total": 10,
        "payment_method": "card",
        "currency": "HUF",
    }
    expected_ocr_text = "TOTAL 10.00"

    def fake_pipeline(_image):
        return expected_ocr_text, json.dumps(expected), [], {
            "retry_limit_reached": False,
            "attempts_used": 1,
            "validation_passed": True,
        }

    monkeypatch.setattr(api, "run_pipeline", fake_pipeline)

    response = client.post(
        "/extract",
        files={"file": ("receipt.png", _make_test_image_bytes(), "image/png")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["ocr_text"] == expected_ocr_text
    assert body["formatted_json"] == expected
    assert body["failed_attempts"] == []
    assert body["llm_meta"]["retry_limit_reached"] is False


def test_extract_retry_limit_reached(monkeypatch):
    def fake_pipeline(_image):
        return "OCR", "{\"bad\":true}", [{"error": "failed"}], {
            "retry_limit_reached": True,
            "attempts_used": 5,
            "validation_passed": False,
        }

    monkeypatch.setattr(api, "run_pipeline", fake_pipeline)

    response = client.post(
        "/extract",
        files={"file": ("receipt.png", _make_test_image_bytes(), "image/png")},
    )
    assert response.status_code == 422
    body = response.json()
    assert body["llm_meta"]["retry_limit_reached"] is True
