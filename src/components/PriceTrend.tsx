import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import type { MonthStat } from '../types'

function fmt(value: unknown): string {
  return `${(value as number).toFixed(2)} ₽`
}

export function PriceTrend({ data }: { data: MonthStat[] }) {
  if (data.length === 0) return <div className="empty-state">No trend data</div>

  return (
    <div className="chart-container">
      <h3>Monthly Spending</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={fmt} />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#2ea6ff"
            strokeWidth={2}
            dot={{ fill: '#2ea6ff', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="trend-summary">
        {data.map(m => (
          <div key={m.month} className="trend-item">
            <span>{m.month}</span>
            <span>{m.total.toFixed(2)} ₽</span>
            <span className="trend-count">{m.count} receipts</span>
          </div>
        ))}
      </div>
    </div>
  )
}
