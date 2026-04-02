export interface Receipt {
  id: number
  userId: string
  item: string
  price: number
  category: string
  receipt: string | null
  receiptDate?: string
}

export interface ReceiptCreate {
  userId: string
  item: string
  price: number
  category: string
  receipt?: string
  receiptDate: string
}

export interface ReceiptUpdate {
  id: number
  item?: string
  price?: number
  category?: string
  receipt?: string
  receiptDate?: string
}

export interface ListFilters {
  userId?: string
  search?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}

export interface StatsFilters {
  userId?: string
  from?: string
  to?: string
}

export interface CategoryStat {
  category: string
  total: number
  count: number
}

export interface MonthStat {
  month: string
  total: number
  count: number
}

export interface TopItem {
  item: string
  count: number
  total: number
}

export interface StatsResponse {
  totalSpent: number
  count: number
  avgPrice: number
  byCategory: CategoryStat[]
  byMonth: MonthStat[]
  topItems: TopItem[]
}

export type Action = 'list' | 'create' | 'update' | 'delete' | 'stats' | 'detail'

export interface ListEntry {
  id: number
  label: string
  date: string
  total: number
  itemCount: number
  isGroup: boolean
}

export interface ReceiptDetail {
  id: number
  label: string
  date: string
  items: Receipt[]
}

export interface WebhookRequest {
  action: Action
  payload: Record<string, unknown>
  auth: {
    initData: string
    token: string
  }
}
