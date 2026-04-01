import { useState } from 'react'
import { useReceipts } from '../hooks/useReceipts'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import type { ListEntry } from '../types'

function ListEntryCard({ entry, onTap, onDelete }: { entry: ListEntry; onTap: (id: number) => void; onDelete: (id: number) => void }) {
  return (
    <div className="list-entry" onClick={() => onTap(entry.id)}>
      <div className="list-entry-main">
        <div className="list-entry-label">
          {entry.isGroup && <span className="group-badge">{entry.itemCount}&times;</span>}
          <span>{entry.label}</span>
        </div>
        <span className="list-entry-date">{format(new Date(entry.date), 'MMM d, yyyy')}</span>
      </div>
      <div className="list-entry-total">${entry.total.toFixed(2)}</div>
      <button className="list-delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(entry.id) }}>
        &#x2715;
      </button>
    </div>
  )
}

export function ReceiptList() {
  const { items, total, loading, filters, applyFilters, loadMore, remove, refresh, categories, hasMore } = useReceipts()
  const navigate = useNavigate()
  const [showFilters, setShowFilters] = useState(false)
  const [search, setSearch] = useState(filters.search || '')
  const [category, setCategory] = useState(filters.category || '')
  const [dateFrom, setDateFrom] = useState(filters.from || '')
  const [dateTo, setDateTo] = useState(filters.to || '')

  const handleApplyFilters = () => {
    applyFilters({
      search: search || undefined,
      category: category || undefined,
      from: dateFrom || undefined,
      to: dateTo || undefined,
    })
    setShowFilters(false)
  }

  const handleClearFilters = () => {
    setSearch('')
    setCategory('')
    setDateFrom('')
    setDateTo('')
    applyFilters({})
  }

  const handleTap = (id: number) => {
    navigate(`/detail/${id}`)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Delete this receipt?')) {
      await remove(id)
    }
  }

  const hasActiveFilters = search || category || dateFrom || dateTo

  return (
    <div className="page">
      <div className="page-header">
        <h1>Receipts ({total})</h1>
        <button className="icon-btn" onClick={refresh} title="Refresh">&#x21bb;</button>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleApplyFilters()}
        />
        <button className="filter-btn" onClick={() => setShowFilters(!showFilters)}>
          &#x2699;
        </button>
      </div>

      {showFilters && (
        <div className="filter-panel">
          <div className="filter-row">
            <label>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">All</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="filter-row">
            <label>From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="filter-row">
            <label>To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <div className="filter-actions">
            <button className="btn-primary" onClick={handleApplyFilters}>Apply</button>
            {hasActiveFilters && <button className="btn-secondary" onClick={handleClearFilters}>Clear</button>}
          </div>
        </div>
      )}

      <div className="receipt-list">
        {items.map(entry => (
          <ListEntryCard key={entry.id} entry={entry} onTap={handleTap} onDelete={handleDelete} />
        ))}
        {items.length === 0 && !loading && (
          <div className="empty-state">No receipts found</div>
        )}
      </div>

      {hasMore && (
        <button className="load-more-btn" onClick={loadMore} disabled={loading}>
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}

      <div className="fab" onClick={() => navigate('/edit')}>+</div>
    </div>
  )
}
