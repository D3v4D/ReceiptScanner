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

export interface ReceiptFilters {
  id?: string;
  include?: string;
  exclude?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface ReceiptCreateInput {
  storeName: string;
  purchaseDateTime: string;
  total: number;
  currency: string;
  items: ReceiptItem[];
}

export interface ReceiptUpdateInput {
  storeName?: string;
  purchaseDateTime?: string;
  total?: number;
  currency?: string;
  items?: ReceiptItem[];
}

export interface ReceiptScanInput {
  userId: string;
  base64Image: string;
}
