'use client'
import { deleteDeal, updateDeal } from '@/app/actions'
import { useState } from 'react'

export default function AdminDealActions({ deal }: { deal: any }) {
  const [isEditing, setIsEditing] = useState(false)
  const [address, setAddress] = useState(deal.address)
  const [type, setType] = useState(deal.type)
  const [dateClosed, setDateClosed] = useState(new Date(deal.dateClosed).toISOString().split('T')[0])
  const [referralPercentage, setReferralPercentage] = useState(deal.referralPercentage || 0)

  if (isEditing) {
    return (
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'flex-end' }}>
        <input type="date" value={dateClosed} onChange={e => setDateClosed(e.target.value)} className="input" style={{ width: '130px', padding: '0.2rem' }} />
        <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="input" style={{ padding: '0.2rem' }} />
        <select value={type} onChange={e => setType(e.target.value)} className="input" style={{ width: '100px', padding: '0.2rem' }}>
          <option value="DATABANK">Databank</option>
          <option value="SOI">SOI</option>
        </select>
        <input type="number" value={referralPercentage} onChange={e => setReferralPercentage(parseFloat(e.target.value))} className="input" style={{ width: '80px', padding: '0.2rem' }} placeholder="Ref %" />
        <button onClick={async () => { await updateDeal(deal.id, address, type, dateClosed, referralPercentage); setIsEditing(false) }} className="btn" style={{ padding: '0.2rem 0.5rem' }}>Save</button>
        <button onClick={() => setIsEditing(false)} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem' }}>Cancel</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
      <button onClick={() => setIsEditing(true)} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>Edit</button>
      <button onClick={async () => { if(confirm('Delete deal?')) await deleteDeal(deal.id) }} className="btn" style={{ backgroundColor: 'var(--danger)', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>Delete</button>
    </div>
  )
}
