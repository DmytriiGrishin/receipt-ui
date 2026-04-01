import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts'
import type { CategoryStat } from '../types'

const COLORS = ['#2ea6ff', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#5ac8fa', '#ffcc00', '#007aff']

function fmt(value: unknown): string {
  return `${(value as number).toFixed(2)} ₽`
}

export function CategoryBreakdown({ data, mode }: { data: CategoryStat[]; mode?: 'detailed' }) {
  if (data.length === 0) return <div className="empty-state">No category data</div>

  if (mode === 'detailed') {
    return (
      <div className="chart-container">
        <h3>Spending by Category</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <XAxis dataKey="category" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={fmt} />
            <Bar dataKey="total" fill="#2ea6ff" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="category-details">
          {data.map((c, i) => (
            <div key={c.category} className="category-row">
              <span className="color-dot" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="cat-name">{c.category}</span>
              <span className="cat-count">{c.count} items</span>
              <span className="cat-total">{c.total.toFixed(2)} ₽</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="chart-container">
      <h3>Spending by Category</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="category"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={(entry: any) => `${entry.category} ${((entry.percent ?? 0) * 100).toFixed(0)}%`}
          >
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={fmt} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
