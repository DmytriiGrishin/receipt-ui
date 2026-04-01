import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getReceiptDetail, updateReceipt, deleteReceipt } from '../api/webhook'
import { format } from 'date-fns'
import type { Receipt } from '../types'

const CATEGORIES = ['Groceries', 'Transport', 'Dining', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Education']

function EditableItem({ item, onSave, onDelete }: { item: Receipt; onSave: (r: Receipt) => void; onDelete: (id: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [itemVal, setItemVal] = useState(item.item)
  const [priceVal, setPriceVal] = useState(item.price.toString())
  const [categoryVal, setCategoryVal] = useState(item.category)
  const [dateVal, setDateVal] = useState(item.receiptDate)

  const handleSave = () => {
    onSave({ ...item, item: itemVal, price: parseFloat(priceVal), category: categoryVal, receiptDate: dateVal })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="edit-item">
        <div className="edit-row">
          <input type="text" value={itemVal} onChange={e => setItemVal(e.target.value)} placeholder="Item" />
          <input type="number" step="0.01" value={priceVal} onChange={e => setPriceVal(e.target.value)} className="edit-price" />
        </div>
        <div className="edit-row">
          <select value={categoryVal} onChange={e => setCategoryVal(e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="date" value={dateVal} onChange={e => setDateVal(e.target.value)} className="edit-date" />
        </div>
        <div className="edit-actions">
          <button className="btn-primary" onClick={handleSave}>Save</button>
          <button className="btn-secondary" onClick={() => { setEditing(false); setItemVal(item.item); setPriceVal(item.price.toString()); setCategoryVal(item.category); setDateVal(item.receiptDate) }}>Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div className="detail-item" onClick={() => setEditing(true)}>
      <div className="detail-item-main">
        <span className="detail-item-name">{item.item}</span>
        <span className="detail-item-price">{item.price.toFixed(2)} ₽</span>
      </div>
      <div className="detail-item-meta">
        <span className="detail-item-category">{item.category}</span>
        <span className="detail-item-date">{item.receiptDate ? format(new Date(item.receiptDate), 'MMM d, yyyy') : ''}</span>
      </div>
      <button className="detail-delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(item.id) }}>
        &#x2715;
      </button>
    </div>
  )
}

export function ReceiptDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getReceiptDetail>> | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const d = await getReceiptDetail(Number(id))
      setDetail(d)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const handleSave = async (updated: Receipt) => {
    await updateReceipt({ id: updated.id, item: updated.item, price: updated.price, category: updated.category, receiptDate: updated.receiptDate })
    load()
  }

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm('Delete this item?')) return
    await deleteReceipt(itemId)
    load()
  }

  if (loading) return <div className="page"><div className="loading">Loading...</div></div>
  if (!detail) return <div className="page"><div className="empty-state">Not found</div></div>

  return (
    <div className="page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>&#x2190; Back</button>
      </div>

      <div className="detail-header">
        <h1 className="detail-title">{detail.label}</h1>
        <span className="detail-date">{format(new Date(detail.date), 'MMMM d, yyyy')}</span>
        <div className="detail-total">
          <span>Total</span>
          <span className="detail-total-value">{detail.items.reduce((s, i) => s + i.price, 0).toFixed(2)} ₽</span>
        </div>
      </div>

      <div className="detail-items">
        {detail.items.map(item => (
          <EditableItem key={item.id} item={item} onSave={handleSave} onDelete={handleDeleteItem} />
        ))}
      </div>
    </div>
  )
}
