import type {
  Receipt,
  ReceiptCreateInput,
  ReceiptFilters,
  ReceiptScanInput,
  ReceiptUpdateInput,
} from '../types/receipt.types'
import { apiClient } from './api'

export const listReceipts = async (
  filters: ReceiptFilters = {},
): Promise<Receipt[]> => (await apiClient.get('/api/receipts', { params: filters })).data

export const createReceipt = async (
  payload: ReceiptCreateInput,
): Promise<Receipt> => (await apiClient.post('/api/receipts', payload)).data

export const updateReceipt = async (
  id: string,
  payload: ReceiptUpdateInput,
): Promise<Receipt> => (await apiClient.put(`/api/receipts/${id}`, payload)).data

export const deleteReceipt = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/receipts/${id}`)
}

export const scanReceipt = async (
  payload: ReceiptScanInput,
): Promise<unknown> => (await apiClient.post('/api/receipts/scan', payload)).data
