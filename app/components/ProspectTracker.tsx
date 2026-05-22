'use client'

import { useState } from 'react'
import { addProspect, deleteProspect, convertProspectToDeal } from '@/app/actions'

type Prospect = {
  id: string;
  clientName: string;
  address: string;
  type: string;
  estimatedSalesPrice: number | null;
  commissionPercentage: number | null;
  referralPercentage: number | null;
  agentId: string;
}

export default function ProspectTracker({ agentId, currentPoints, prospects }: { agentId: string, currentPoints: number, prospects: Prospect[] }) {
  const [isAdding, setIsAdding] = useState(false)

  const databankProspects = prospects.filter(p => p.type === 'DATABANK').length
  const soiProspects = prospects.filter(p => p.type === 'SOI').length

  const databankPoints = databankProspects * 1.2
  const soiPoints = soiProspects * 2.4
  const estimatedTotal = currentPoints + databankPoints + soiPoints
  
  const threshold = 25
  const isGraduating = estimatedTotal >= threshold

  const totalNetCommission = prospects.reduce((sum, p) => {
    if (!p.estimatedSalesPrice || !p.commissionPercentage) return sum;
    const comm = p.estimatedSalesPrice * (p.commissionPercentage / 100);
    const referral = p.referralPercentage ? comm * (p.referralPercentage / 100) : 0;
    return sum + (comm - referral);
  }, 0);

  const handleAddProspect = async (formData: FormData) => {
    await addProspect(agentId, formData)
    setIsAdding(false)
  }

  return (
    <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
      <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#1e293b' }}>Active Prospect Pipeline</h3>
      <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>Track your active prospects and see your estimated graduation progress and potential commissions.</p>
      
      {/* Estimator Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Databank Prospects</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#334155' }}>{databankProspects} <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#94a3b8' }}>(+{databankPoints.toFixed(1)} pts)</span></div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>SOI Prospects</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#334155' }}>{soiProspects} <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#94a3b8' }}>(+{soiPoints.toFixed(1)} pts)</span></div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Pot. Net Commission</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>
            ${totalNetCommission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Estimated Total Points</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: isGraduating ? '#10b981' : '#1e293b' }}>
            {estimatedTotal.toFixed(1)} <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 500 }}>/ {threshold}</span>
          </div>
          {isGraduating && (
            <div style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: 600, marginTop: '0.25rem' }}>🎉 Threshold Met!</div>
          )}
        </div>
      </div>

      {/* Prospect List */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#334155' }}>Pipeline Deals</h4>
          {!isAdding && (
            <button onClick={() => setIsAdding(true)} className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>+ Add Prospect</button>
          )}
        </div>

        {isAdding && (
          <form action={handleAddProspect} style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h5 style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>New Prospect Details</h5>
            <div className="form-grid-2">
              <div>
                <label className="label" style={{ fontSize: '0.75rem' }}>Client Name</label>
                <input type="text" name="clientName" className="input" required placeholder="John Doe" />
              </div>
              <div>
                <label className="label" style={{ fontSize: '0.75rem' }}>Property Address</label>
                <input type="text" name="address" className="input" required placeholder="123 Main St" />
              </div>
            </div>
            <div className="form-grid-3">
              <div>
                <label className="label" style={{ fontSize: '0.75rem' }}>Type</label>
                <select name="type" className="input" required>
                  <option value="DATABANK">Databank (1.2 pts)</option>
                  <option value="SOI">Sphere of Influence (2.4 pts)</option>
                </select>
              </div>
              <div>
                <label className="label" style={{ fontSize: '0.75rem' }}>Est. Sales Price ($)</label>
                <input type="number" name="estimatedSalesPrice" className="input" step="0.01" placeholder="350000" />
              </div>
              <div>
                <label className="label" style={{ fontSize: '0.75rem' }}>Commission %</label>
                <input type="number" name="commissionPercentage" className="input" step="0.01" placeholder="3" />
              </div>
            </div>
            <div className="form-grid-2">
              <div>
                <label className="label" style={{ fontSize: '0.75rem' }}>Referral % (Optional)</label>
                <input type="number" name="referralPercentage" className="input" step="0.01" placeholder="25" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'flex-end' }}>
                <button type="button" onClick={() => setIsAdding(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn">Save Prospect</button>
              </div>
            </div>
          </form>
        )}

        {prospects.length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0' }}>No active prospects in your pipeline.</p>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem', fontWeight: 600, color: '#475569' }}>Client</th>
                  <th style={{ padding: '0.75rem', fontWeight: 600, color: '#475569' }}>Address</th>
                  <th style={{ padding: '0.75rem', fontWeight: 600, color: '#475569' }}>Type</th>
                  <th style={{ padding: '0.75rem', fontWeight: 600, color: '#475569' }}>Est. Net Comm.</th>
                  <th style={{ padding: '0.75rem', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {prospects.map(p => {
                  let netComm = 0;
                  if (p.estimatedSalesPrice && p.commissionPercentage) {
                    const comm = p.estimatedSalesPrice * (p.commissionPercentage / 100);
                    const ref = p.referralPercentage ? comm * (p.referralPercentage / 100) : 0;
                    netComm = comm - ref;
                  }

                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem', color: '#1e293b', fontWeight: 500 }}>{p.clientName}</td>
                      <td style={{ padding: '0.75rem', color: '#475569' }}>{p.address}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ backgroundColor: p.type === 'SOI' ? '#e0e7ff' : '#f1f5f9', color: p.type === 'SOI' ? '#4f46e5' : '#475569', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                          {p.type}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                        {netComm > 0 ? `$${netComm.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button onClick={() => convertProspectToDeal(p.id, agentId)} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', backgroundColor: '#10b981' }}>Convert to Deal</button>
                          <button onClick={() => deleteProspect(p.id, agentId)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#ef4444', borderColor: '#ef4444' }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
