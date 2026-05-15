'use client'

import { useState } from 'react'
import { editAgentProfile } from '@/app/actions'

export default function AdminEditProfileForm({ agent }: { agent: { id: string, name: string, email: string | null, role: string, isFirstSpOverride: boolean, disableFirstSpCredit: boolean, startDate: Date } }) {
  const [name, setName] = useState(agent.name)
  const [email, setEmail] = useState(agent.email || '')
  const [password, setPassword] = useState('')
  const [startDateStr, setStartDateStr] = useState(new Date(agent.startDate).toISOString().substring(0, 10))
  const [isOverride, setIsOverride] = useState(agent.isFirstSpOverride)
  const [isDisableFirstSp, setIsDisableFirstSp] = useState(agent.disableFirstSpCredit)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      await editAgentProfile(agent.id, name, email, password || undefined, isOverride, startDateStr, isDisableFirstSp)
      setMessage('Profile updated successfully.')
      setPassword('') // clear the password field
    } catch (error) {
      setMessage('Error updating profile.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {message && (
        <div style={{ padding: '0.5rem', backgroundColor: message.includes('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)', color: message.includes('Error') ? 'var(--danger)' : '#16a34a', borderRadius: '4px', fontSize: '0.875rem' }}>
          {message}
        </div>
      )}
      
      <div>
        <label className="label" htmlFor="edit-name">Name</label>
        <input type="text" id="edit-name" value={name} onChange={e => setName(e.target.value)} className="input" required />
      </div>
      
      <div>
        <label className="label" htmlFor="edit-email">Login Email</label>
        <input type="email" id="edit-email" value={email} onChange={e => setEmail(e.target.value)} className="input" required />
      </div>

      <div>
        <label className="label" htmlFor="edit-start-date">Start Date</label>
        <input type="date" id="edit-start-date" value={startDateStr} onChange={e => setStartDateStr(e.target.value)} className="input" required />
      </div>
      
      <div>
        <label className="label" htmlFor="edit-password">New Password (leave blank to keep current)</label>
        <input type="password" id="edit-password" value={password} onChange={e => setPassword(e.target.value)} className="input" placeholder="••••••••" />
      </div>

      {agent.role === 'SHOWING_PARTNER' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
          <input type="checkbox" id="edit-override" checked={isOverride} onChange={e => setIsOverride(e.target.checked)} style={{ width: 'auto' }} />
          <label htmlFor="edit-override" style={{ fontSize: '0.875rem' }}>Force 1st SP Status (Override 3-month cost offset)</label>
        </div>
      )}

      {agent.role === 'TEAM_AGENT' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
          <input type="checkbox" id="edit-disable-first-sp" checked={isDisableFirstSp} onChange={e => setIsDisableFirstSp(e.target.checked)} style={{ width: 'auto' }} />
          <label htmlFor="edit-disable-first-sp" style={{ fontSize: '0.875rem', color: 'var(--danger)' }}>Disable 1st SP Auto-Credit (Admin Only)</label>
        </div>
      )}
      
      <button type="submit" className="btn" disabled={loading} style={{ marginTop: '0.5rem' }}>
        {loading ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  )
}
