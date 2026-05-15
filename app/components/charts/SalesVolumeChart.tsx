'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function SalesVolumeChart({ deals }: { deals: any[] }) {
  // Group deals by month and sum salesPrice * commissionPercentage
  const monthlyData = new Map<string, number>()

  deals.forEach(deal => {
    if (!deal.salesPrice || !deal.commissionPercentage) return;
    const gci = deal.salesPrice * (deal.commissionPercentage / 100);
    const date = new Date(deal.dateClosed)
    const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    
    monthlyData.set(monthYear, (monthlyData.get(monthYear) || 0) + gci)
  })

  // Create array and sort chronologically
  const chartData = Array.from(monthlyData.entries()).map(([month, volume]) => ({
    month,
    volume
  })).reverse() // Assuming deals are sorted desc by date, so reverse for chart

  // Fill empty months if we want to show a 12-month trailing view
  // But for now just showing months with deals is fine.

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`
    }
    return `$${value}`
  }

  return (
    <div style={{ width: '100%', height: 300 }}>
      {chartData.length === 0 ? (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          No deals logged yet.
        </div>
      ) : (
        <ResponsiveContainer>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatCurrency} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip 
              cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
              formatter={(value: any) => [`$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'GCI Volume']}
            />
            <Bar dataKey="volume" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
