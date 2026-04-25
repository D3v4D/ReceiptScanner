import type { ReceiptForm, ReceiptLineForm } from "../../../shared/types/receipt";

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const readValue = (source: Record<string, unknown>, keys: string[]): string => {
  for (const key of keys) {
    const raw = source[key];
    if (raw !== undefined && raw !== null) {
      return String(raw);
    }
  }

  return "";
};

const parseJsonText = (text: string): unknown | null => {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue with fallback extraction.
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    try {
      return JSON.parse(fencedMatch[1]);
    } catch {
      // Continue with fallback extraction.
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const objectCandidate = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(objectCandidate);
    } catch {
      // Continue with array fallback.
    }
  }

  const firstBracket = trimmed.indexOf("[");
  const lastBracket = trimmed.lastIndexOf("]");
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    const arrayCandidate = trimmed.slice(firstBracket, lastBracket + 1);
    try {
      return JSON.parse(arrayCandidate);
    } catch {
      return null;
    }
  }

  return null;
};

export const normalizeScanPayload = (value: unknown): unknown => {
  if (typeof value === "string") {
    return parseJsonText(value) ?? { rawResponse: value };
  }

  if (Array.isArray(value)) {
    return value;
  }

  const root = asRecord(value);
  if (!root) {
    return value;
  }

  if (root.payload && typeof root.payload === "object") {
    return normalizeScanPayload(root.payload);
  }

  if (root.formatted_json !== undefined) {
    const formattedJson = root.formatted_json;
    if (formattedJson && typeof formattedJson === "object") {
      return formattedJson;
    }
  }

  if (typeof root.formatted_text === "string") {
    const parsed = parseJsonText(root.formatted_text);
    if (parsed !== null) {
      return parsed;
    }
  }

  if (typeof root.message === "string") {
    const parsedMessage = parseJsonText(root.message);
    if (parsedMessage !== null) {
      return normalizeScanPayload(parsedMessage);
    }
  }

  for (const key of ["data", "result", "receipt", "payload"]) {
    const candidate = root[key];
    if (candidate && typeof candidate === "object") {
      const candidateRecord = asRecord(candidate);
      if (
        candidateRecord?.store ||
        candidateRecord?.products ||
        candidateRecord?.items ||
        candidateRecord?.lines
      ) {
        return candidate;
      }
    }
  }

  return root;
};

export const extractScanId = (value: unknown): number | null => {
  const root = asRecord(value);
  if (!root) {
    return null;
  }

  const scanIdCandidate = root.scan_id ?? root.scanId;
  if (typeof scanIdCandidate === "number" && Number.isFinite(scanIdCandidate)) {
    return scanIdCandidate;
  }

  if (typeof scanIdCandidate === "string") {
    const parsed = Number(scanIdCandidate);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

export const normalizeScanResultToForm = (value: unknown): Partial<ReceiptForm> => {
  const normalized = normalizeScanPayload(value);
  const root = asRecord(normalized);
  if (!root) {
    return {};
  }

  const store = asRecord(root.store) ?? {};
  const productArray = Array.isArray(root.products)
    ? root.products
    : Array.isArray(root.lines)
      ? root.lines
      : Array.isArray(root.items)
        ? root.items
        : [];

  const lines: ReceiptLineForm[] = productArray
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((item) => ({
      name: readValue(item, ["name", "productName", "description", "item"]),
      quantity: readValue(item, ["quantity", "qty", "amount"]),
      unit: readValue(item, ["unit", "uom"]),
      unitPrice: readValue(item, ["unit_price", "unitPrice", "price"]),
      totalPrice: readValue(item, ["total_price", "totalPrice", "lineTotal", "sum"]),
    }));

  return {
    storeName: readValue(store, ["name", "storeName"]) || readValue(root, ["storeName", "store_name"]),
    storeAddress: readValue(store, ["address", "storeAddress"]),
    storeTaxNumber: readValue(store, ["taxNumber", "tax_number", "vat", "vat_number"]),
    storeChain: readValue(store, ["chain", "storeChain"]),
    purchaseDateTime: readValue(root, ["purchase_datetime", "purchaseDateTime", "date", "datetime"]),
    total: readValue(root, ["total", "grand_total", "amount_total"]),
    paymentMethod: readValue(root, ["payment_method", "paymentMethod", "payment"]),
    currency: readValue(root, ["currency", "curr"]),
    lines,
  };
};
