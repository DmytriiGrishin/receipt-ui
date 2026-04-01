import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'
import type { TopItem } from '../types'

const COLORS = ['#ff9500', '#ff3b30', '#af52de', '#2ea6ff', '#34c759', '#5ac8fa', '#ffcc00', '#007aff', '#ff2d55', '#64d2ff']

function fmt(value: unknown): string {
  return `$${(value as number).toFixed(2)}`
}

export function TopItems({ data }: { data: TopItem[] }) {
  if (data.length === 0) return <div className="empty-state">No item data</div>

  return (
    <div className="chart-container">
      <h3>Top 10 Items by Spending</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="item" tick={{ fontSize: 11 }} width={120} />
          <Tooltip formatter={fmt} />
          <Bar dataKey="total" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="top-items-details">
        {data.map((item, i) => (
          <div key={item.item} className="top-item-row">
            <span className="rank">#{i + 1}</span>
            <span className="item-name">{item.item}</span>
            <span className="item-count">{item.count}x</span>
            <span className="item-total">${item.total.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
