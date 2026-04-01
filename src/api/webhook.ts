import type {
  Action,
  ReceiptCreate,
  ReceiptUpdate,
  ListFilters,
  StatsFilters,
  StatsResponse,
  WebhookRequest,
  ListEntry,
  ReceiptDetail,
} from '../types'
import { WEBHOOK_URL } from '../utils/env'
import { getInitData } from '../utils/telegram'
import { mockApi } from '../mock/api'

function buildPayload(action: Action, payload: Record<string, unknown>): WebhookRequest {
  return {
    action,
    payload,
    auth: {
      initData: getInitData(),
      token: '',
    },
  }
}

async function post<T>(action: Action, payload: Record<string, unknown>): Promise<T> {
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(buildPayload(action, payload)),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function listReceipts(filters: ListFilters): Promise<{ items: ListEntry[]; total: number }> {
  if (WEBHOOK_URL === '/mock') {
    return mockApi.list(filters)
  }
  return post('list', filters as unknown as Record<string, unknown>)
}

export async function getReceiptDetail(id: number): Promise<ReceiptDetail> {
  if (WEBHOOK_URL === '/mock') {
    return mockApi.detail(id)
  }
  return post('detail', { id })
}

export async function createReceipt(data: ReceiptCreate): Promise<{ id: number }> {
  if (WEBHOOK_URL === '/mock') {
    return mockApi.create(data)
  }
  return post('create', data as unknown as Record<string, unknown>)
}

export async function updateReceipt(data: ReceiptUpdate): Promise<{ success: boolean }> {
  if (WEBHOOK_URL === '/mock') {
    return mockApi.update(data)
  }
  return post('update', data as unknown as Record<string, unknown>)
}

export async function deleteReceipt(id: number): Promise<{ success: boolean }> {
  if (WEBHOOK_URL === '/mock') {
    return mockApi.delete(id)
  }
  return post('delete', { id })
}

export async function deleteItem(id: number): Promise<{ success: boolean }> {
  if (WEBHOOK_URL === '/mock') {
    return mockApi.delete(id)
  }
  return post('delete', { id })
}

export async function getStats(filters: StatsFilters): Promise<StatsResponse> {
  if (WEBHOOK_URL === '/mock') {
    return mockApi.stats(filters)
  }
  return post('stats', filters as unknown as Record<string, unknown>)
}
