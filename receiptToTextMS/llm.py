import requests
import json

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "qwen2.5:7b"


def _call_llm(prompt):
    r = requests.post(
        OLLAMA_URL,
        json={
            "model": MODEL,
            "prompt": prompt,
            "stream": False,
            "temperature": 0,
            "format": "json"
        }
    )
    return r.json()["response"]


REQUIRED_KEYS = {"store", "purchase_datetime", "products", "total", "payment_method", "currency"}
REQUIRED_STORE_KEYS = {"name", "address", "chain"}
REQUIRED_PRODUCT_KEYS = {"name", "quantity", "unit", "unit_price", "total_price"}


def _check_nulls(data, path=""):
    """Recursively check for any null values. Returns (ok, path_of_null).
    tax_number is allowed to be null.
    """
    NULLABLE_FIELDS = {"tax_number"}
    if data is None:
        return False, path or "root"
    if isinstance(data, dict):
        for k, v in data.items():
            if k in NULLABLE_FIELDS:
                continue
            ok, p = _check_nulls(v, f"{path}.{k}" if path else k)
            if not ok:
                return False, p
    if isinstance(data, list):
        for i, v in enumerate(data):
            ok, p = _check_nulls(v, f"{path}[{i}]")
            if not ok:
                return False, p
    return True, None


def _validate_schema(data):
    """Returns (ok, error_message)."""
    if not isinstance(data, dict):
        return False, "Response is not a JSON object."

    # Check required top-level keys exist
    missing = REQUIRED_KEYS - data.keys()
    if missing:
        return False, f"Missing top-level keys: {missing}"

    # No nulls anywhere
    ok, null_path = _check_nulls(data)
    if not ok:
        return False, f"Null value found at '{null_path}' — all fields must have real values."

    # products must be a list
    products = data.get("products")
    if not isinstance(products, list) or len(products) == 0:
        return False, "'products' must be a non-empty array."

    # Each product must have required keys
    for i, p in enumerate(products):
        if not isinstance(p, dict):
            return False, f"products[{i}] is not an object."
        missing_prod = REQUIRED_PRODUCT_KEYS - p.keys()
        if missing_prod:
            return False, f"Missing keys in products[{i}]: {missing_prod}"

    return True, None


def _validate_sum(data):
    """Returns (ok, error_message). Checks sum of product total_prices == total."""
    try:
        products = data.get("products", [])
        product_sum = round(sum(float(p["total_price"]) for p in products), 2)
        total = round(float(data["total"]), 2)
        if product_sum != total:
            return False, f"Sum of product prices ({product_sum}) does not match total ({total})."
    except (TypeError, ValueError, KeyError) as e:
        return False, f"Could not validate sum: {e}"
    return True, None


def _deduplicate_products(data):
    """Merge duplicate products (same name) by summing quantity and total_price."""
    products = data.get("products")
    if not isinstance(products, list):
        return data

    merged = {}
    for p in products:
        name = p.get("name", "").strip().lower()
        if name not in merged:
            merged[name] = {
                "name": p.get("name"),
                "quantity": p.get("quantity") or 0,
                "unit": p.get("unit"),
                "unit_price": p.get("unit_price"),
                "total_price": p.get("total_price") or 0,
            }
        else:
            existing = merged[name]
            existing["quantity"] = (existing["quantity"] or 0) + (p.get("quantity") or 0)
            existing["total_price"] = round(
                (existing["total_price"] or 0) + (p.get("total_price") or 0), 2
            )
            if not existing.get("unit") and p.get("unit"):
                existing["unit"] = p.get("unit")
            if existing["quantity"]:
                existing["unit_price"] = round(existing["total_price"] / existing["quantity"], 2)

    data["products"] = list(merged.values())
    return data


MAX_RETRIES = 5


def _collect_null_paths(data, path="", nullable_fields=None):
    if nullable_fields is None:
        nullable_fields = {"tax_number"}

    null_paths = []
    if data is None:
        return [path or "root"]

    if isinstance(data, dict):
        for k, v in data.items():
            if k in nullable_fields:
                continue
            child_path = f"{path}.{k}" if path else k
            null_paths.extend(_collect_null_paths(v, child_path, nullable_fields))

    if isinstance(data, list):
        for i, v in enumerate(data):
            null_paths.extend(_collect_null_paths(v, f"{path}[{i}]", nullable_fields))

    return null_paths


def _is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _collect_schema_errors(data):
    errors = []
    if not isinstance(data, dict):
        return ["Response is not a JSON object."]

    missing = REQUIRED_KEYS - data.keys()
    extra = data.keys() - REQUIRED_KEYS
    if missing:
        errors.append(f"Missing top-level keys: {sorted(missing)}")
    if extra:
        errors.append(f"Unexpected top-level keys: {sorted(extra)}")

    store = data.get("store")
    if not isinstance(store, dict):
        errors.append("'store' must be an object.")
    else:
        missing_store = REQUIRED_STORE_KEYS - store.keys()
        extra_store = store.keys() - REQUIRED_STORE_KEYS
        if missing_store:
            errors.append(f"Missing keys in store: {sorted(missing_store)}")
        if extra_store:
            errors.append(f"Unexpected keys in store: {sorted(extra_store)}")

    if not isinstance(data.get("purchase_datetime"), str):
        errors.append("'purchase_datetime' must be a string.")
    if not isinstance(data.get("payment_method"), str):
        errors.append("'payment_method' must be a string.")
    if not isinstance(data.get("currency"), str):
        errors.append("'currency' must be a string.")
    if "total" in data and not _is_number(data.get("total")):
        errors.append("'total' must be a number.")

    null_paths = _collect_null_paths(data)
    if null_paths:
        errors.append(f"Null values found at: {null_paths}")

    products = data.get("products")
    if not isinstance(products, list) or len(products) == 0:
        errors.append("'products' must be a non-empty array.")
    else:
        for i, p in enumerate(products):
            if not isinstance(p, dict):
                errors.append(f"products[{i}] is not an object.")
                continue
            missing_prod = REQUIRED_PRODUCT_KEYS - p.keys()
            extra_prod = p.keys() - REQUIRED_PRODUCT_KEYS
            if missing_prod:
                errors.append(f"Missing keys in products[{i}]: {sorted(missing_prod)}")
            if extra_prod:
                errors.append(f"Unexpected keys in products[{i}]: {sorted(extra_prod)}")
            if "name" in p and not isinstance(p.get("name"), str):
                errors.append(f"products[{i}].name must be a string.")
            if "unit" in p and not isinstance(p.get("unit"), str):
                errors.append(f"products[{i}].unit must be a string.")
            if "quantity" in p and not _is_number(p.get("quantity")):
                errors.append(f"products[{i}].quantity must be a number.")
            if "unit_price" in p and not _is_number(p.get("unit_price")):
                errors.append(f"products[{i}].unit_price must be a number.")
            if "total_price" in p and not _is_number(p.get("total_price")):
                errors.append(f"products[{i}].total_price must be a number.")

    return errors


def _collect_sum_errors(data):
    errors = []
    try:
        products = data.get("products", [])
        product_sum = round(sum(float(p["total_price"]) for p in products), 2)
        total = round(float(data["total"]), 2)
        if product_sum != total:
            errors.append(f"Sum mismatch: product total is {product_sum} but 'total' is {total}.")
    except (TypeError, ValueError, KeyError) as e:
        errors.append(f"Could not validate sum: {e}")
    return errors


def _format_faults_for_prompt(faults):
    if not faults:
        return "- No validation faults detected."
    return "\n".join(f"- {fault}" for fault in faults)


def parse_to_json(ocr_text, text_with_boxes=None):
    """Returns (final_response_text, failed_attempts, meta).
    meta fields:
    - retry_limit_reached: bool
    - attempts_used: int
    - validation_passed: bool
    """
    prompt = build_prompt(ocr_text, text_with_boxes)
    failed = []
    response = None

    for attempt in range(1, MAX_RETRIES + 1):
        response = _call_llm(prompt)
        print(f"[LLM attempt {attempt}] response preview: {response}")

        try:
            data = json.loads(response)
        except json.JSONDecodeError as e:
            error_msg = f"Invalid JSON: {e}"
            print(f"[LLM attempt {attempt}] FAILED — {error_msg}")
            failed.append({"response": response, "error": error_msg})
            prompt = (
                f"Previous output was not valid JSON (error: {e}).\n"
                f"Here is your previous output:\n{response}\n\n"
                "Detected faults in previous response:\n"
                "- Invalid JSON format.\n\n"
                "Return ONLY valid JSON matching the schema. No explanations, no markdown, no extra text.\n"
                "IMPORTANT: Keep all correct values unchanged. Only fix the JSON formatting issue.\n\n"
                + build_prompt(ocr_text, text_with_boxes)
            )
            continue

        data = _deduplicate_products(data)
        response = json.dumps(data, ensure_ascii=False, indent=2)

        schema_errors = _collect_schema_errors(data)
        sum_errors = _collect_sum_errors(data)
        all_faults = schema_errors + sum_errors

        if all_faults:
            fault_text = _format_faults_for_prompt(all_faults)
            error_msg = "Validation faults: " + " | ".join(all_faults)
            print(f"[LLM attempt {attempt}] FAILED — {error_msg}")
            failed.append({"response": response, "error": error_msg, "faults": all_faults})

            prompt = (
                "Previous output was valid JSON but failed validation.\n"
                "Detected faults in previous response:\n"
                f"{fault_text}\n\n"
                f"Your previous response:\n{response}\n\n"
                "Return ONLY valid JSON matching the schema exactly.\n"
                "IMPORTANT: Keep all correct values unchanged. Only fix fields directly related to the listed faults.\n\n"
                + build_prompt(ocr_text, text_with_boxes)
            )
            continue

        print(f"[LLM attempt {attempt}] OK — no validation faults detected.")
        return response, failed, {
            "retry_limit_reached": False,
            "attempts_used": attempt,
            "validation_passed": True,
        }

    print(f"[LLM] Giving up after {MAX_RETRIES} attempts.")
    return response, failed, {
        "retry_limit_reached": True,
        "attempts_used": MAX_RETRIES,
        "validation_passed": False,
    }


def build_prompt(ocr_text, text_with_boxes=None):
    # Format the OCR data with bounding boxes if available
    if text_with_boxes:
        ocr_data = []
        for item in text_with_boxes:
            box = item['box']
            # Calculate center position for spatial reference
            center_x = sum([point[0] for point in box]) / 4
            center_y = sum([point[1] for point in box]) / 4
            ocr_data.append({
                "text": item['text'],
                "confidence": round(item['confidence'], 3),
                "position": {
                    "x": round(center_x, 1),
                    "y": round(center_y, 1)
                },
                "bounding_box": box
            })
        ocr_section = f"""
OCR TEXT WITH SPATIAL INFORMATION:
{ocr_data}

Plain text (for reference):
{ocr_text}
"""
    else:
        ocr_section = f"""
OCR TEXT:
{ocr_text}
"""

    return f"""
    You are a receipt and invoice document parser. 

    Your task:
    Extract structured information from a shopping receipt.

    Important rules:
    - Output ONLY valid JSON.
    - No explanations.
    - No markdown.
    - No text outside JSON.
    - NEVER MAKE UP VALUES. If information is missing, use null ONLY for tax_number. All other fields must have real extracted values.
    - Include ALL products listed on the receipt. Do NOT drop, skip, or omit any line item for any reason.
    - Correct obvious OCR errors in product names (e.g. garbled characters) but keep the item in the list.
    - Do NOT interpret or judge whether a product "belongs" on the receipt — list everything.
    - quantity means how many units of that product were purchased. It is always a number (e.g. 1, 2, 3).
    - If the same product appears multiple times on the receipt, it means multiple units were bought. Combine them into ONE entry: sum the quantities and sum the total_price. The unit_price stays the same.
    - The sum of all product total_price values MUST equal the total field exactly.

    ---

    Return this JSON schema:

    {{
      "store": {{
        "name": "string",
        "address": "string",
        "chain": "string"
      }},
      "purchase_datetime": "string (ISO format)",
      "products": [
        {{
          "name": "string",
          "quantity": "number",
          "unit": "string", 
          "unit_price": "number",
          "total_price": "number"
        }}
      ],
      "total": "number",
      "payment_method": "string",
      "currency": "string"
    }}

    OCR TEXT:
    ----------------
    {ocr_text}
    ----------------
    """