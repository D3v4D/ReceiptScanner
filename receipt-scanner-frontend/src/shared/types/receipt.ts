export type AuthUser = {
  id: number;
  email: string;
  username: string;
};

export type ReceiptApiLine = {
  id: number;
  name: string;
  quantity: string;
  unit: string;
  unitPrice: number;
};

export type ReceiptApiResponse = {
  id: number;
  sourceScanId: number | null;
  storeName: string;
  purchaseDateTime: string;
  currency: string;
  lines: ReceiptApiLine[];
};

export type ReceiptLineForm = {
  name: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  totalPrice: string;
};

export type EditableReceiptLine = {
  id: number;
  name: string;
  quantity: string;
  unit: string;
  unitPrice: string;
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
