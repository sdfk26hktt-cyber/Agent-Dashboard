'use client'

import { useState } from 'react'
import { addProspect, deleteProspect, convertProspectToDeal, editProspect, updateProspectStatus } from '@/app/actions'

type Prospect = {
  id: string;
  clientName: string;
  address: string;
  type: string;
  status?: string;
  estimatedSalesPrice: number | null;
  commissionPercentage: number | null;
  referralPercentage: number | null;
  agentId: string;
}

export default function ProspectTracker({ agentId, currentPoints, prospects }: { agentId: string, currentPoints: number, prospects: Prospect[] }) {
  const [isAdding, setIsAdding] = useState(false)
  const [addDefaultStatus, setAddDefaultStatus] = useState<'PIPELINE' | 'PENDING'>('PIPELINE')
  const [editingProspectId, setEditingProspectId] = useState<string | null>(null)
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null)

  const [projectedDatabank, setProjectedDatabank] = useState<number | ''>('')
  const [projectedSoi, setProjectedSoi] = useState<number | ''>('')
  const [targetDate, setTargetDate] = useState<string>('')

  const pipelineProspects = prospects.filter(p => !p.status || p.status === 'PIPELINE')
  const pendingDeals = prospects.filter(p => p.status === 'PENDING')

  const pipelineDatabank = pipelineProspects.filter(p => p.type === 'DATABANK').length
  const pipelineSoi = pipelineProspects.filter(p => p.type === 'SOI').length
  const pipelinePoints = (pipelineDatabank * 1.2) + (pipelineSoi * 2.4)

  const pendingDatabank = pendingDeals.filter(p => p.type === 'DATABANK').length
  const pendingSoi = pendingDeals.filter(p => p.type === 'SOI').length
  const pendingPoints = (pendingDatabank * 1.2) + (pendingSoi * 2.4)

  const totalProspectPoints = pipelinePoints + pendingPoints
  const estimatedTotal = currentPoints + totalProspectPoints
  const threshold = 25
  const isGraduating = estimatedTotal >= threshold
  
  const projectedDatabankPoints = (Number(projectedDatabank) || 0) * 1.2
  const projectedSoiPoints = (Number(projectedSoi) || 0) * 2.4
  let projectedTenurePoints = 0
  if (targetDate) {
    const today = new Date().getTime();
    const target = new Date(targetDate).getTime();
    if (target > today) {
      const futureMonths = (target - today) / (1000 * 60 * 60 * 24 * 30);
      projectedTenurePoints = futureMonths * 1.5;
    }
  }

  const projectedTotal = estimatedTotal + projectedDatabankPoints + projectedSoiPoints + projectedTenurePoints
  const isProjectedGraduating = projectedTotal >= threshold

  const calculateNetComm = (p: Prospect) => {
    if (!p.estimatedSalesPrice || !p.commissionPercentage) return 0;
    const comm = p.estimatedSalesPrice * (p.commissionPercentage / 100);
    const referral = p.referralPercentage ? comm * (p.referralPercentage / 100) : 0;
    return comm - referral;
  };

  const pendingVolume = pendingDeals.reduce((sum, p) => sum + (p.estimatedSalesPrice || 0), 0);
  const pendingNetCommission = pendingDeals.reduce((sum, p) => sum + calculateNetComm(p), 0);
  const pipelineNetCommission = pipelineProspects.reduce((sum, p) => sum + calculateNetComm(p), 0);
  const totalPotentialCommission = pendingNetCommission + pipelineNetCommission;

  const handleAddProspect = async (formData: FormData) => {
    await addProspect(agentId, formData)
    setIsAdding(false)
  }

  const handleEditProspect = async (prospectId: string, formData: FormData) => {
    await editProspect(prospectId, agentId, formData)
    setEditingProspectId(null)
  }

  const handleMoveStatus = async (prospectId: string, newStatus: string) => {
    setLoadingActionId(prospectId)
    try {
      await updateProspectStatus(prospectId, agentId, newStatus)
    } finally {
      setLoadingActionId(null)
    }
  }

  const handleConvertToDeal = async (prospectId: string, clientName: string) => {
    if (confirm(`Convert "${clientName || 'this deal'}" to an officially Closed Deal?`)) {
      setLoadingActionId(prospectId)
      try {
        await convertProspectToDeal(prospectId, agentId)
      } finally {
        setLoadingActionId(null)
      }
    }
  }

  return (
    <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', color: '#1e293b', margin: 0 }}>Showing Partner Deal Dashboard</h3>
      </div>
      <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
        Track your pipeline, monitor deals under contract in pending status, and advance deals toward closing.
      </p>
      
      {/* Estimator Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Active Pipeline</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#334155' }}>
              {pipelineProspects.length} <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#94a3b8' }}>(+{pipelinePoints.toFixed(1)} pts)</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{pipelineDatabank} Databank · {pipelineSoi} SOI</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#b45309', fontWeight: 600 }}>Pending (Under Contract)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#d97706' }}>
              {pendingDeals.length} <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#f59e0b' }}>(+{pendingPoints.toFixed(1)} pts)</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#b45309' }}>{pendingDatabank} Databank · {pendingSoi} SOI</div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Projected Commissions</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>
            ${totalPotentialCommission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            ${pendingNetCommission.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Pending · ${pipelineNetCommission.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Pipeline
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Estimated Total Points</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: isGraduating ? '#10b981' : '#1e293b' }}>
            {estimatedTotal.toFixed(1)} <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 500 }}>/ {threshold}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {currentPoints.toFixed(1)} closed + {pendingPoints.toFixed(1)} pending + {pipelinePoints.toFixed(1)} pipeline
          </div>
          {isGraduating && (
            <div style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: 600, marginTop: '0.25rem' }}>🎉 Threshold Met!</div>
          )}
        </div>
      </div>

      {/* What-If Estimator */}
      <div style={{ padding: '1.25rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', margin: 0 }}>Future Projection Estimator</h4>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Projected Total Points</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: isProjectedGraduating ? '#10b981' : '#3b82f6' }}>
              {projectedTotal.toFixed(1)} <span style={{ fontSize: '0.875rem', color: '#94a3b8', fontWeight: 500 }}>/ {threshold}</span>
            </div>
          </div>
        </div>
        <div className="form-grid-3">
          <div>
            <label className="label" style={{ fontSize: '0.75rem' }}>Addtl. Databank Deals (+1.2 pts)</label>
            <input type="number" min="0" className="input" placeholder="0" value={projectedDatabank} onChange={e => setProjectedDatabank(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
          <div>
            <label className="label" style={{ fontSize: '0.75rem' }}>Addtl. SOI Deals (+2.4 pts)</label>
            <input type="number" min="0" className="input" placeholder="0" value={projectedSoi} onChange={e => setProjectedSoi(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
          <div>
            <label className="label" style={{ fontSize: '0.75rem' }}>Target Graduation Date</label>
            <input type="date" className="input" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
            {projectedTenurePoints > 0 && <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem' }}>+{projectedTenurePoints.toFixed(1)} tenure points by this date</div>}
          </div>
        </div>
      </div>

      {/* Shared Add Form Modal / Inline */}
      {isAdding && (
        <form action={handleAddProspect} style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '8px', border: '2px solid #3b82f6', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h5 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, color: '#1e293b' }}>
              Add New {addDefaultStatus === 'PENDING' ? 'Pending Deal' : 'Pipeline Prospect'}
            </h5>
            <button type="button" onClick={() => setIsAdding(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#64748b' }}>×</button>
          </div>
          <div className="form-grid-3">
            <div>
              <label className="label" style={{ fontSize: '0.75rem' }}>Initial Status</label>
              <select name="status" className="input" defaultValue={addDefaultStatus} required>
                <option value="PIPELINE">Active Pipeline</option>
                <option value="PENDING">Pending (Under Contract)</option>
              </select>
            </div>
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
              <label className="label" style={{ fontSize: '0.75rem' }}>Lead Type</label>
              <select name="type" className="input" required>
                <option value="DATABANK">Databank (1.2 pts)</option>
                <option value="SOI">Sphere of Influence (2.4 pts)</option>
              </select>
            </div>
            <div>
              <label className="label" style={{ fontSize: '0.75rem' }}>Est. / Contract Sales Price ($)</label>
              <input type="number" name="estimatedSalesPrice" className="input" step="0.01" placeholder="350000" />
            </div>
            <div>
              <label className="label" style={{ fontSize: '0.75rem' }}>Commission %</label>
              <input type="number" name="commissionPercentage" className="input" step="0.01" placeholder="3" defaultValue="3" />
            </div>
          </div>
          <div className="form-grid-2">
            <div>
              <label className="label" style={{ fontSize: '0.75rem' }}>Referral % (Optional)</label>
              <input type="number" name="referralPercentage" className="input" step="0.01" placeholder="0" defaultValue="0" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'flex-end' }}>
              <button type="button" onClick={() => setIsAdding(false)} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn">Save</button>
            </div>
          </div>
        </form>
      )}

      {/* SECTION 1: Active Pipeline */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>Active Pipeline</h4>
            <span style={{ backgroundColor: '#e2e8f0', color: '#475569', padding: '0.2rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
              {pipelineProspects.length}
            </span>
          </div>
          {!isAdding && (
            <button onClick={() => { setAddDefaultStatus('PIPELINE'); setIsAdding(true); }} className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>
              + Add Pipeline Prospect
            </button>
          )}
        </div>

        {pipelineProspects.length === 0 ? (
          <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
            No active prospects in your pipeline. Click "+ Add Pipeline Prospect" to start tracking leads.
          </div>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem', fontWeight: 600, color: '#475569' }}>Client</th>
                  <th style={{ padding: '0.75rem', fontWeight: 600, color: '#475569' }}>Address</th>
                  <th style={{ padding: '0.75rem', fontWeight: 600, color: '#475569' }}>Type</th>
                  <th style={{ padding: '0.75rem', fontWeight: 600, color: '#475569' }}>Est. Price</th>
                  <th style={{ padding: '0.75rem', fontWeight: 600, color: '#475569' }}>Est. Net Comm.</th>
                  <th style={{ padding: '0.75rem', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pipelineProspects.map(p => {
                  const netComm = calculateNetComm(p);

                  if (editingProspectId === p.id) {
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td colSpan={6} style={{ padding: '0' }}>
                          <form action={(formData) => handleEditProspect(p.id, formData)} style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#f8fafc' }}>
                            <div className="form-grid-3">
                              <div>
                                <label className="label" style={{ fontSize: '0.75rem' }}>Status</label>
                                <select name="status" className="input" defaultValue={p.status || 'PIPELINE'}>
                                  <option value="PIPELINE">Active Pipeline</option>
                                  <option value="PENDING">Pending (Under Contract)</option>
                                </select>
                              </div>
                              <div>
                                <label className="label" style={{ fontSize: '0.75rem' }}>Client Name</label>
                                <input type="text" name="clientName" className="input" required defaultValue={p.clientName} />
                              </div>
                              <div>
                                <label className="label" style={{ fontSize: '0.75rem' }}>Property Address</label>
                                <input type="text" name="address" className="input" required defaultValue={p.address} />
                              </div>
                            </div>
                            <div className="form-grid-3">
                              <div>
                                <label className="label" style={{ fontSize: '0.75rem' }}>Type</label>
                                <select name="type" className="input" required defaultValue={p.type}>
                                  <option value="DATABANK">Databank (1.2 pts)</option>
                                  <option value="SOI">Sphere of Influence (2.4 pts)</option>
                                </select>
                              </div>
                              <div>
                                <label className="label" style={{ fontSize: '0.75rem' }}>Est. Sales Price ($)</label>
                                <input type="number" name="estimatedSalesPrice" className="input" step="0.01" defaultValue={p.estimatedSalesPrice || ''} />
                              </div>
                              <div>
                                <label className="label" style={{ fontSize: '0.75rem' }}>Commission %</label>
                                <input type="number" name="commissionPercentage" className="input" step="0.01" defaultValue={p.commissionPercentage || ''} />
                              </div>
                            </div>
                            <div className="form-grid-2">
                              <div>
                                <label className="label" style={{ fontSize: '0.75rem' }}>Referral %</label>
                                <input type="number" name="referralPercentage" className="input" step="0.01" defaultValue={p.referralPercentage || ''} />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'flex-end' }}>
                                <button type="button" onClick={() => setEditingProspectId(null)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn">Update Prospect</button>
                              </div>
                            </div>
                          </form>
                        </td>
                      </tr>
                    )
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
                      <td style={{ padding: '0.75rem', color: '#475569' }}>
                        {p.estimatedSalesPrice ? `$${p.estimatedSalesPrice.toLocaleString()}` : '-'}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                        {netComm > 0 ? `$${netComm.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button 
                            disabled={loadingActionId === p.id}
                            onClick={() => handleMoveStatus(p.id, 'PENDING')} 
                            className="btn" 
                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', backgroundColor: '#f59e0b', color: 'white', whiteSpace: 'nowrap' }}
                            title="Move to Pending (deal under contract)"
                          >
                            {loadingActionId === p.id ? 'Moving...' : '➔ Move to Pending'}
                          </button>
                          <button onClick={() => setEditingProspectId(p.id)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Edit</button>
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

      {/* SECTION 2: Pending Deals (Between Pipeline and Closed) */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#b45309', margin: 0 }}>Pending Deals (Under Contract)</h4>
            <span style={{ backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700 }}>
              {pendingDeals.length} Under Contract
            </span>
          </div>
          {!isAdding && (
            <button onClick={() => { setAddDefaultStatus('PENDING'); setIsAdding(true); }} className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem', backgroundColor: '#d97706' }}>
              + Add Pending Deal
            </button>
          )}
        </div>
        <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
          Deals that are currently under contract or in escrow, waiting to close. When funded, mark as Closed. If the contract falls through, return to Pipeline.
        </p>

        {/* Pending Highlights Bar */}
        {pendingDeals.length > 0 && (
          <div style={{ display: 'flex', gap: '1rem', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#92400e', textTransform: 'uppercase', fontWeight: 600 }}>Pending Volume: </span>
              <span style={{ fontWeight: 700, color: '#b45309' }}>${pendingVolume.toLocaleString()}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#92400e', textTransform: 'uppercase', fontWeight: 600 }}>Projected Net Commission: </span>
              <span style={{ fontWeight: 700, color: '#047857' }}>${pendingNetCommission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#92400e', textTransform: 'uppercase', fontWeight: 600 }}>Points on Closing: </span>
              <span style={{ fontWeight: 700, color: '#b45309' }}>+{pendingPoints.toFixed(1)} pts</span>
            </div>
          </div>
        )}

        {pendingDeals.length === 0 ? (
          <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '8px', border: '1px dashed #fde68a', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
            No deals currently pending. Click "➔ Move to Pending" on an active pipeline prospect once an offer is accepted!
          </div>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #fde68a' }}>
              <thead>
                <tr style={{ backgroundColor: '#fffbeb', borderBottom: '1px solid #fde68a', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem', fontWeight: 600, color: '#92400e' }}>Client</th>
                  <th style={{ padding: '0.75rem', fontWeight: 600, color: '#92400e' }}>Address</th>
                  <th style={{ padding: '0.75rem', fontWeight: 600, color: '#92400e' }}>Type</th>
                  <th style={{ padding: '0.75rem', fontWeight: 600, color: '#92400e' }}>Contract Price</th>
                  <th style={{ padding: '0.75rem', fontWeight: 600, color: '#92400e' }}>Projected Net Comm.</th>
                  <th style={{ padding: '0.75rem', fontWeight: 600, color: '#92400e', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingDeals.map(p => {
                  const netComm = calculateNetComm(p);

                  if (editingProspectId === p.id) {
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid #fef3c7' }}>
                        <td colSpan={6} style={{ padding: '0' }}>
                          <form action={(formData) => handleEditProspect(p.id, formData)} style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#fffdf7' }}>
                            <div className="form-grid-3">
                              <div>
                                <label className="label" style={{ fontSize: '0.75rem' }}>Status</label>
                                <select name="status" className="input" defaultValue={p.status || 'PENDING'}>
                                  <option value="PENDING">Pending (Under Contract)</option>
                                  <option value="PIPELINE">Active Pipeline</option>
                                </select>
                              </div>
                              <div>
                                <label className="label" style={{ fontSize: '0.75rem' }}>Client Name</label>
                                <input type="text" name="clientName" className="input" required defaultValue={p.clientName} />
                              </div>
                              <div>
                                <label className="label" style={{ fontSize: '0.75rem' }}>Property Address</label>
                                <input type="text" name="address" className="input" required defaultValue={p.address} />
                              </div>
                            </div>
                            <div className="form-grid-3">
                              <div>
                                <label className="label" style={{ fontSize: '0.75rem' }}>Type</label>
                                <select name="type" className="input" required defaultValue={p.type}>
                                  <option value="DATABANK">Databank (1.2 pts)</option>
                                  <option value="SOI">Sphere of Influence (2.4 pts)</option>
                                </select>
                              </div>
                              <div>
                                <label className="label" style={{ fontSize: '0.75rem' }}>Contract Sales Price ($)</label>
                                <input type="number" name="estimatedSalesPrice" className="input" step="0.01" defaultValue={p.estimatedSalesPrice || ''} />
                              </div>
                              <div>
                                <label className="label" style={{ fontSize: '0.75rem' }}>Commission %</label>
                                <input type="number" name="commissionPercentage" className="input" step="0.01" defaultValue={p.commissionPercentage || ''} />
                              </div>
                            </div>
                            <div className="form-grid-2">
                              <div>
                                <label className="label" style={{ fontSize: '0.75rem' }}>Referral %</label>
                                <input type="number" name="referralPercentage" className="input" step="0.01" defaultValue={p.referralPercentage || ''} />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'flex-end' }}>
                                <button type="button" onClick={() => setEditingProspectId(null)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn">Update Deal</button>
                              </div>
                            </div>
                          </form>
                        </td>
                      </tr>
                    )
                  }

                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #fef3c7' }}>
                      <td style={{ padding: '0.75rem', color: '#1e293b', fontWeight: 600 }}>{p.clientName}</td>
                      <td style={{ padding: '0.75rem', color: '#475569' }}>{p.address}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ backgroundColor: p.type === 'SOI' ? '#e0e7ff' : '#fef3c7', color: p.type === 'SOI' ? '#4f46e5' : '#b45309', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                          {p.type}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', color: '#1e293b', fontWeight: 500 }}>
                        {p.estimatedSalesPrice ? `$${p.estimatedSalesPrice.toLocaleString()}` : '-'}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#10b981', fontWeight: 700 }}>
                        {netComm > 0 ? `$${netComm.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button 
                            disabled={loadingActionId === p.id}
                            onClick={() => handleConvertToDeal(p.id, p.clientName)} 
                            className="btn" 
                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', backgroundColor: '#10b981', color: 'white', whiteSpace: 'nowrap' }}
                            title="Mark as officially closed"
                          >
                            {loadingActionId === p.id ? 'Converting...' : '✓ Convert to Closed'}
                          </button>
                          <button 
                            disabled={loadingActionId === p.id}
                            onClick={() => handleMoveStatus(p.id, 'PIPELINE')} 
                            className="btn btn-secondary" 
                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                            title="Move back to Active Pipeline"
                          >
                            ↩ Back to Pipeline
                          </button>
                          <button onClick={() => setEditingProspectId(p.id)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Edit</button>
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
