import { useState, useEffect, useCallback } from 'react'
import { listReceipts, deleteReceipt } from '../api/webhook'
import type { ListEntry, ListFilters } from '../types'

const CATEGORIES = ['Groceries', 'Transport', 'Dining', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Education']

export function useReceipts() {
  const [items, setItems] = useState<ListEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<ListFilters>({})
  const [offset, setOffset] = useState(0)
  const limit = 15

  const load = useCallback(async (newFilters?: ListFilters, newOffset?: number) => {
    setLoading(true)
    try {
      const f = newFilters ?? filters
      const o = newOffset ?? offset
      const result = await listReceipts({ ...f, limit, offset: o })
      if (o === 0) {
        setItems(result.items)
      } else {
        setItems(prev => [...prev, ...result.items])
      }
      setTotal(result.total)
    } finally {
      setLoading(false)
    }
  }, [filters, offset])

  useEffect(() => { load() }, [])

  const applyFilters = (newFilters: ListFilters) => {
    setFilters(newFilters)
    setOffset(0)
    load(newFilters, 0)
  }

  const loadMore = () => {
    const next = offset + limit
    if (next < total) {
      setOffset(next)
      load(filters, next)
    }
  }

  const remove = async (id: number) => {
    await deleteReceipt(id)
    setItems(prev => prev.filter(e => e.id !== id))
    setTotal(prev => prev - 1)
  }

  const refresh = () => {
    setOffset(0)
    load(filters, 0)
  }

  return { items, total, loading, filters, applyFilters, loadMore, remove, refresh, categories: CATEGORIES, hasMore: offset + items.length < total }
}
