import type { ReceiptForm } from "../../../shared/types/receipt";

export const buildReceiptPayload = (form: ReceiptForm, scanId: number | null) => ({
  scan_id: scanId,
  store: {
    name: form.storeName,
    address: form.storeAddress,
    taxNumber: Number(form.storeTaxNumber || 0),
    chain: form.storeChain,
  },
  purchase_datetime: form.purchaseDateTime,
  products: form.lines.map((line) => ({
    name: line.name,
    quantity: Number(line.quantity || 0),
    unit: line.unit,
    unit_price: Number(line.unitPrice || 0),
    total_price: Number(line.totalPrice || 0),
  })),
  total: Number(form.total || 0),
  payment_method: form.paymentMethod,
  currency: form.currency,
});
