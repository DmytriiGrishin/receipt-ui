import axios from 'axios'
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

export async function listReceipts(filters: ListFilters): Promise<{ items: ListEntry[]; total: number }> {
  if (WEBHOOK_URL === '/mock') {
    return mockApi.list(filters)
  }
  const { data } = await axios.post(WEBHOOK_URL, buildPayload('list', filters as unknown as Record<string, unknown>))
  return data
}

export async function getReceiptDetail(id: number): Promise<ReceiptDetail> {
  if (WEBHOOK_URL === '/mock') {
    return mockApi.detail(id)
  }
  const { data } = await axios.post(WEBHOOK_URL, buildPayload('detail', { id }))
  return data
}

export async function createReceipt(data: ReceiptCreate): Promise<{ id: number }> {
  if (WEBHOOK_URL === '/mock') {
    return mockApi.create(data)
  }
  const { data: result } = await axios.post(WEBHOOK_URL, buildPayload('create', data as unknown as Record<string, unknown>))
  return result
}

export async function updateReceipt(data: ReceiptUpdate): Promise<{ success: boolean }> {
  if (WEBHOOK_URL === '/mock') {
    return mockApi.update(data)
  }
  const { data: result } = await axios.post(WEBHOOK_URL, buildPayload('update', data as unknown as Record<string, unknown>))
  return result
}

export async function deleteReceipt(id: number): Promise<{ success: boolean }> {
  if (WEBHOOK_URL === '/mock') {
    return mockApi.delete(id)
  }
  const { data: result } = await axios.post(WEBHOOK_URL, buildPayload('delete', { id }))
  return result
}

export async function deleteItem(id: number): Promise<{ success: boolean }> {
  if (WEBHOOK_URL === '/mock') {
    return mockApi.delete(id)
  }
  const { data: result } = await axios.post(WEBHOOK_URL, buildPayload('delete', { id }))
  return result
}

export async function getStats(filters: StatsFilters): Promise<StatsResponse> {
  if (WEBHOOK_URL === '/mock') {
    return mockApi.stats(filters)
  }
  const { data } = await axios.post(WEBHOOK_URL, buildPayload('stats', filters as unknown as Record<string, unknown>))
  return data
}
