import { useState, useEffect } from 'react'
import { getStats } from '../api/webhook'
import { CategoryBreakdown } from './CategoryBreakdown'
import { PriceTrend } from './PriceTrend'
import { TopItems } from './TopItems'
import type { StatsResponse } from '../types'

export function StatsDashboard() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'categories' | 'trend' | 'top'>('overview')

  useEffect(() => {
    getStats({}).then(s => {
      setStats(s)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="page"><div className="loading">Loading stats...</div></div>
  if (!stats) return <div className="page"><div className="empty-state">No data available</div></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1>Statistics</h1>
      </div>

      <div className="stats-overview">
        <div className="stat-card">
          <span className="stat-value">{stats.totalSpent.toFixed(2)} ₽</span>
          <span className="stat-label">Total Spent</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.count}</span>
          <span className="stat-label">Receipts</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.avgPrice.toFixed(2)} ₽</span>
          <span className="stat-label">Avg Price</span>
        </div>
      </div>

      <div className="tab-bar">
        <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>Overview</button>
        <button className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}>Categories</button>
        <button className={tab === 'trend' ? 'active' : ''} onClick={() => setTab('trend')}>Trend</button>
        <button className={tab === 'top' ? 'active' : ''} onClick={() => setTab('top')}>Top Items</button>
      </div>

      <div className="tab-content">
        {tab === 'overview' && <CategoryBreakdown data={stats.byCategory} />}
        {tab === 'categories' && <CategoryBreakdown data={stats.byCategory} mode="detailed" />}
        {tab === 'trend' && <PriceTrend data={stats.byMonth} />}
        {tab === 'top' && <TopItems data={stats.topItems} />}
      </div>
    </div>
  )
}
