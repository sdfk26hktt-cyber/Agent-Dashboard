'use client'
import { deleteGci, updateGci } from '@/app/actions'
import { useState } from 'react'

export default function AdminGciActions({ gci }: { gci: any }) {
  const [isEditing, setIsEditing] = useState(false)
  const [amount, setAmount] = useState(gci.amount)
  const [month, setMonth] = useState(new Date(gci.month).toISOString().substring(0, 7))

  if (isEditing) {
    return (
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'flex-end' }}>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="input" style={{ width: '150px', padding: '0.2rem' }} />
        <input type="number" step="0.01" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} className="input" style={{ width: '120px', padding: '0.2rem' }} />
        <button onClick={async () => { await updateGci(gci.id, amount, month); setIsEditing(false) }} className="btn" style={{ padding: '0.2rem 0.5rem' }}>Save</button>
        <button onClick={() => setIsEditing(false)} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem' }}>Cancel</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
      <button onClick={() => setIsEditing(true)} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>Edit</button>
      <button onClick={async () => { if(confirm('Delete GCI log?')) await deleteGci(gci.id) }} className="btn" style={{ backgroundColor: 'var(--danger)', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>Delete</button>
    </div>
  )
}
