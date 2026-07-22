export type AuthUser = {
  id: number;
  email: string;
  username: string;
};

export type Category = {
  id: number;
  name: string;
  description?: string;
};

export type ReceiptApiLine = {
  id: number;
  name: string;
  quantity: string;
  unit: string;
  unitPrice: number;
  category?: Category | null;
};

export type ReceiptApiResponse = {
  id: number;
  sourceScanId: number | null;
  storeName: string;
  storeAddress: string;
  storeTaxNumber: string;
  storeChain: string;
  purchaseDateTime: string;
  total: number;
  paymentMethod: string;
  currency: string;
  lines: ReceiptApiLine[];
};

export type ReceiptLineForm = {
  name: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  totalPrice: string;
  categoryId: number | null;
};

export type EditableReceiptLine = {
  id: number;
  name: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  category?: Category | null;
};

export type EditableReceiptMeta = {
  storeName: string;
  storeAddress: string;
  storeTaxNumber: string;
  storeChain: string;
  purchaseDateTime: string;
  total: string;
  paymentMethod: string;
  currency: string;
};

export type ReceiptForm = {
  storeName: string;
  storeAddress: string;
  storeTaxNumber: string;
  storeChain: string;
  purchaseDateTime: string;
  total: string;
  paymentMethod: string;
  currency: string;
  lines: ReceiptLineForm[];
};

export const createEmptyLine = (): ReceiptLineForm => ({
  name: "",
  quantity: "1",
  unit: "piece",
  unitPrice: "0",
  totalPrice: "0",
  categoryId: null,
});

export const createEmptyForm = (): ReceiptForm => ({
  storeName: "",
  storeAddress: "",
  storeTaxNumber: "0",
  storeChain: "",
  purchaseDateTime: new Date().toISOString(),
  total: "0",
  paymentMethod: "CARD",
  currency: "HUF",
  lines: [createEmptyLine()],
});
