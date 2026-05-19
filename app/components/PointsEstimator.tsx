'use client'

import { useState } from 'react'

export default function PointsEstimator({ currentPoints }: { currentPoints: number }) {
  const [estDatabank, setEstDatabank] = useState(0)
  const [estSoi, setEstSoi] = useState(0)

  const databankPoints = estDatabank * 1.2
  const soiPoints = estSoi * 2.4
  const estimatedTotal = currentPoints + databankPoints + soiPoints
  
  const threshold = 25
  const isGraduating = estimatedTotal >= threshold

  return (
    <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
      <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', color: '#1e293b' }}>Predict Your Success</h3>
      <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>Estimate how many points you will earn if you close your current pipeline.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#334155' }}>Est. Databank Deals (1.2 pts)</label>
          <input 
            type="number" 
            min="0"
            value={estDatabank} 
            onChange={(e) => setEstDatabank(parseInt(e.target.value) || 0)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#334155' }}>Est. SOI Deals (2.4 pts)</label>
          <input 
            type="number" 
            min="0"
            value={estSoi} 
            onChange={(e) => setEstSoi(parseInt(e.target.value) || 0)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
        <div>
          <div style={{ fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Estimated Total</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: isGraduating ? '#10b981' : '#1e293b' }}>
            {estimatedTotal.toFixed(1)} <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 500 }}>/ {threshold}</span>
          </div>
        </div>

        {isGraduating && (
          <div style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '0.5rem 1rem', borderRadius: '9999px', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🎉 You would graduate!
          </div>
        )}
      </div>
    </div>
  )
}
