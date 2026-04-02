import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import WebApp from '@twa-dev/sdk'
import { createReceipt, updateReceipt, getReceiptDetail } from '../api/webhook'
import { getUserId } from '../utils/telegram'

export function ReceiptForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id

  const [item, setItem] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [receipt, setReceipt] = useState('')
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isEdit) {
      getReceiptDetail(Number(id)).then(detail => {
        if (detail.items.length === 1) {
          const r = detail.items[0]
          setItem(r.item)
          setPrice(r.price.toString())
          setCategory(r.category)
          setReceipt(r.receipt || '')
          setReceiptDate(r.receiptDate || '')
        }
      })
    }
  }, [id])

  useEffect(() => {
    const valid = item.trim() && price && category && receiptDate
    if (valid) {
      WebApp.MainButton.setText(saving ? 'Saving...' : (isEdit ? 'Update' : 'Create'))
      WebApp.MainButton.show()
      WebApp.MainButton.setParams({ color: '#2ea6ff' })
    } else {
      WebApp.MainButton.hide()
    }
  }, [item, price, category, receiptDate, saving, isEdit])

  useEffect(() => {
    const handler = () => {
      if (saving) return
      setSaving(true)
      const userId = getUserId()
      const payload = {
        userId,
        item: item.trim(),
        price: parseFloat(price),
        category,
        receipt: receipt.trim() || undefined,
        receiptDate,
      }

      const promise = isEdit
        ? updateReceipt({ id: Number(id), ...payload })
        : createReceipt(payload)

      promise.then(() => {
        setSaving(false)
        navigate(-1)
      }).catch(() => {
        setSaving(false)
        WebApp.showAlert('Failed to save. Try again.')
      })
    }

    WebApp.MainButton.onClick(handler)
    return () => { WebApp.MainButton.offClick(handler) }
  }, [item, price, category, receipt, receiptDate, id, isEdit, navigate, saving])

  return (
    <div className="page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>&#x2190; Back</button>
        <h1>{isEdit ? 'Edit Item' : 'New Item'}</h1>
      </div>

      <form className="form" onSubmit={e => e.preventDefault()}>
        <div className="form-group">
          <label>Item *</label>
          <input type="text" value={item} onChange={e => setItem(e.target.value)} placeholder="e.g. Coffee" required />
        </div>

        <div className="form-group">
          <label>Price *</label>
          <input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" required />
        </div>

        <div className="form-group">
          <label>Category *</label>
          <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Groceries" required />
        </div>

        <div className="form-group">
          <label>Receipt Reference</label>
          <input type="text" value={receipt} onChange={e => setReceipt(e.target.value)} placeholder="e.g. Receipt #1234" />
        </div>

        <div className="form-group">
          <label>Date *</label>
          <input type="date" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} required />
        </div>
      </form>
    </div>
  )
}
