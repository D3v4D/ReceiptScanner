import axios from 'axios'
import type { Receipt } from '../types/receipt.types'

const REST_API_BASE_URL = 'http://localhost:8080/api/receipts'

export const listReceipts = async (): Promise<Receipt[]> => (await axios.get(REST_API_BASE_URL)).data


