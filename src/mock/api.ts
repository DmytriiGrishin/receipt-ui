import type { Receipt, ReceiptCreate, ReceiptUpdate, ListFilters, StatsFilters, CategoryStat, MonthStat, TopItem, ListEntry, ReceiptDetail } from '../types'

const TEST_ITEMS: { item: string; category: string; price: [number, number] }[] = [
  { item: 'Milk', category: 'Groceries', price: [1.5, 3.5] },
  { item: 'Bread', category: 'Groceries', price: [2, 4] },
  { item: 'Eggs (12)', category: 'Groceries', price: [3, 6] },
  { item: 'Chicken Breast', category: 'Groceries', price: [5, 12] },
  { item: 'Rice (1kg)', category: 'Groceries', price: [2, 5] },
  { item: 'Tomatoes', category: 'Groceries', price: [1.5, 4] },
  { item: 'Cheese', category: 'Groceries', price: [3, 8] },
  { item: 'Coffee', category: 'Groceries', price: [5, 15] },
  { item: 'Bus Ticket', category: 'Transport', price: [2, 3] },
  { item: 'Taxi Ride', category: 'Transport', price: [8, 25] },
  { item: 'Gas (full tank)', category: 'Transport', price: [40, 70] },
  { item: 'Uber to Airport', category: 'Transport', price: [25, 45] },
  { item: 'Pizza', category: 'Dining', price: [10, 20] },
  { item: 'Sushi Set', category: 'Dining', price: [15, 35] },
  { item: 'Burger & Fries', category: 'Dining', price: [8, 15] },
  { item: 'Coffee & Cake', category: 'Dining', price: [5, 12] },
  { item: 'Thai Dinner', category: 'Dining', price: [12, 25] },
  { item: 'Electricity Bill', category: 'Utilities', price: [30, 80] },
  { item: 'Internet Bill', category: 'Utilities', price: [25, 50] },
  { item: 'Water Bill', category: 'Utilities', price: [10, 25] },
  { item: 'Movie Ticket', category: 'Entertainment', price: [8, 15] },
  { item: 'Streaming Subscription', category: 'Entertainment', price: [10, 20] },
  { item: 'Concert Ticket', category: 'Entertainment', price: [30, 100] },
  { item: 'Board Game', category: 'Entertainment', price: [15, 40] },
  { item: 'Pharmacy', category: 'Health', price: [5, 30] },
  { item: 'Gym Membership', category: 'Health', price: [25, 60] },
  { item: 'T-Shirt', category: 'Shopping', price: [10, 35] },
  { item: 'Running Shoes', category: 'Shopping', price: [50, 120] },
  { item: 'Book', category: 'Education', price: [10, 25] },
  { item: 'Online Course', category: 'Education', price: [20, 100] },
]

function rand(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100
}

function randomDate(from: Date, to: Date): Date {
  return new Date(from.getTime() + Math.random() * (to.getTime() - from.getTime()))
}

function generateTestData(): Receipt[] {
  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)
  const receipts: Receipt[] = []
  let id = 1
  const receiptNum = { current: 1 }

  function addReceipt(template: typeof TEST_ITEMS[0], date: Date, receiptRef: string | null) {
    receipts.push({
      id: id++,
      userId: '123456789',
      item: template.item,
      price: rand(template.price[0], template.price[1]),
      category: template.category,
      receipt: receiptRef,
      receiptDate: date.toISOString().split('T')[0],
    })
  }

  for (let i = 0; i < 25; i++) {
    const date = randomDate(sixMonthsAgo, now)
    const ref = `Receipt #${String(receiptNum.current++).padStart(4, '0')}`
    const count = Math.floor(Math.random() * 4) + 2
    const used = new Set<number>()
    for (let j = 0; j < count; j++) {
      let idx: number
      do { idx = Math.floor(Math.random() * TEST_ITEMS.length) } while (used.has(idx) && used.size < TEST_ITEMS.length)
      used.add(idx)
      addReceipt(TEST_ITEMS[idx], date, ref)
    }
  }

  for (let i = 0; i < 20; i++) {
    const date = randomDate(sixMonthsAgo, now)
    const idx = Math.floor(Math.random() * TEST_ITEMS.length)
    addReceipt(TEST_ITEMS[idx], date, null)
  }

  receipts.sort((a, b) => new Date(b.receiptDate!).getTime() - new Date(a.receiptDate!).getTime())
  return receipts
}

let data = generateTestData()
let nextId = data.length + 1

function buildGroups(items: Receipt[]): { groups: Map<string | null, Receipt[]>; allReceipts: Receipt[] } {
  const groups = new Map<string | null, Receipt[]>()
  for (const r of items) {
    const key = r.receipt
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(r)
  }
  return { groups, allReceipts: items }
}

function groupsToEntries(groups: Map<string | null, Receipt[]>): ListEntry[] {
  const entries: ListEntry[] = []
  for (const [key, items] of groups) {
    const sorted = [...items].sort((a, b) => new Date(b.receiptDate!).getTime() - new Date(a.receiptDate!).getTime())
    entries.push({
      id: sorted[0].id,
      label: key || sorted[0].item,
      date: sorted[0].receiptDate || '',
      total: Math.round(items.reduce((s, r) => s + r.price, 0) * 100) / 100,
      itemCount: items.length,
      isGroup: key !== null,
    })
  }
  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return entries
}

function applyFilters(items: Receipt[], filters: ListFilters): Receipt[] {
  let result = [...items]
  if (filters.search) {
    const q = filters.search.toLowerCase()
    result = result.filter(r => r.item.toLowerCase().includes(q) || r.category.toLowerCase().includes(q) || (r.receipt?.toLowerCase().includes(q)))
  }
  if (filters.from) {
    result = result.filter(r => r.receiptDate != null && r.receiptDate >= filters.from!)
  }
  if (filters.to) {
    result = result.filter(r => r.receiptDate != null && r.receiptDate <= filters.to!)
  }
  if (filters.userId) {
    result = result.filter(r => r.userId === filters.userId)
  }
  return result
}

export const mockApi = {
  list(filters: ListFilters): { items: ListEntry[]; total: number } {
    const filtered = applyFilters(data, filters)
    const { groups } = buildGroups(filtered)
    const entries = groupsToEntries(groups)
    const offset = filters.offset || 0
    const limit = filters.limit || 15
    return {
      items: entries.slice(offset, offset + limit),
      total: entries.length,
    }
  },

  detail(id: number): ReceiptDetail {
    const item = data.find(r => r.id === id)
    if (!item) throw new Error('Not found')

    if (item.receipt) {
      const items = data.filter(r => r.receipt === item.receipt).sort((a, b) => b.price - a.price)
      return {
        id,
        label: item.receipt,
        date: item.receiptDate || '',
        items,
      }
    }

    return {
      id,
      label: item.item,
      date: item.receiptDate || '',
      items: [item],
    }
  },

  create(input: ReceiptCreate): { id: number } {
    const newReceipt: Receipt = {
      id: nextId++,
      userId: input.userId,
      item: input.item,
      price: input.price,
      category: input.category,
      receipt: input.receipt || null,
      receiptDate: input.receiptDate,
    }
    data.push(newReceipt)
    return { id: newReceipt.id }
  },

  update(input: ReceiptUpdate): { success: boolean } {
    const idx = data.findIndex(r => r.id === input.id)
    if (idx === -1) throw new Error('Receipt not found')
    if (input.item !== undefined) data[idx].item = input.item
    if (input.price !== undefined) data[idx].price = input.price
    if (input.category !== undefined) data[idx].category = input.category
    if (input.receipt !== undefined) data[idx].receipt = input.receipt
    if (input.receiptDate !== undefined) data[idx].receiptDate = input.receiptDate
    return { success: true }
  },

  delete(id: number): { success: boolean } {
    const idx = data.findIndex(r => r.id === id)
    if (idx === -1) throw new Error('Receipt not found')
    data.splice(idx, 1)
    return { success: true }
  },

  stats(filters: StatsFilters): { totalSpent: number; count: number; avgPrice: number; byCategory: CategoryStat[]; byMonth: MonthStat[]; topItems: TopItem[] } {
    let items = [...data]
    if (filters.userId) items = items.filter(r => r.userId === filters.userId)
    if (filters.from) items = items.filter(r => r.receiptDate != null && r.receiptDate >= filters.from!)
    if (filters.to) items = items.filter(r => r.receiptDate != null && r.receiptDate <= filters.to!)

    const totalSpent = items.reduce((s, r) => s + r.price, 0)
    const count = items.length
    const avgPrice = count > 0 ? totalSpent / count : 0

    const catMap = new Map<string, { total: number; count: number }>()
    for (const r of items) {
      const existing = catMap.get(r.category) || { total: 0, count: 0 }
      existing.total += r.price
      existing.count++
      catMap.set(r.category, existing)
    }
    const byCategory = Array.from(catMap.entries())
      .map(([category, v]) => ({ category, total: Math.round(v.total * 100) / 100, count: v.count }))
      .sort((a, b) => b.total - a.total)

    const monthMap = new Map<string, { total: number; count: number }>()
    for (const r of items) {
      const month = r.receiptDate?.substring(0, 7) || ''
      const existing = monthMap.get(month) || { total: 0, count: 0 }
      existing.total += r.price
      existing.count++
      monthMap.set(month, existing)
    }
    const byMonth = Array.from(monthMap.entries())
      .map(([month, v]) => ({ month, total: Math.round(v.total * 100) / 100, count: v.count }))
      .sort((a, b) => a.month.localeCompare(b.month))

    const itemMap = new Map<string, { total: number; count: number }>()
    for (const r of items) {
      const existing = itemMap.get(r.item) || { total: 0, count: 0 }
      existing.total += r.price
      existing.count++
      itemMap.set(r.item, existing)
    }
    const topItems = Array.from(itemMap.entries())
      .map(([item, v]) => ({ item, total: Math.round(v.total * 100) / 100, count: v.count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    return {
      totalSpent: Math.round(totalSpent * 100) / 100,
      count,
      avgPrice: Math.round(avgPrice * 100) / 100,
      byCategory,
      byMonth,
      topItems,
    }
  },
}
