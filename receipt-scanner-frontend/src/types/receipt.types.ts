export interface Receipt {
  id: string;
  storeName: string;
  purchaseDateTime: string;
  total: number;
  currency: string;
  items: ReceiptItem[];
}

export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unit: number;
  unitPrice: number;
  currency: string;
  total: number;
}