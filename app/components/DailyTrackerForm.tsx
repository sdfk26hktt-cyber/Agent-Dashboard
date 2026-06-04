'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { saveDailyTracker } from '@/app/actions'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

const ACTIVITIES = [
  { id: 'calls', label: 'Calls', points: 1, unit: 'call' },
  { id: 'emails', label: 'Emails/Texts', points: 1, unit: 'email' },
  { id: 'notes', label: 'Handwritten Notes', points: 2, unit: 'note' },
  { id: 'homesClient', label: '2 Homes 1 Client', points: 10, unit: '2 homes' },
  { id: 'apt', label: 'Buyer/Listing Appointment', points: 10, unit: 'apt' },
  { id: 'agreement', label: 'Buyer/Listing Agreement', points: 10, unit: 'agreement' },
  { id: 'offer', label: 'Offer Written', points: 10, unit: 'offer' },
  { id: 'closing', label: 'Closing', points: 15, unit: 'closing' },
  { id: 'openHouse', label: 'Open House', points: 10, unit: 'hour' },
  { id: 'doorKnocking', label: 'Door Knocking', points: 1, unit: 'door' },
  { id: '1mt', label: '1MT 1MT (1 More Thing 1 More Time)', points: 1, unit: '' },
  { id: 'rolePlay', label: 'Role Play Script', points: 10, unit: 'hour' }
]

const TIME_BLOCKS = [
  '7:30 AM', '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', 
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM',
  '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM'
]

export default function DailyTrackerForm({ agentId, agentName, initialData, readOnly, targetDate }: { agentId: string, agentName: string, initialData?: any, readOnly?: boolean, targetDate?: string }) {
  const router = useRouter()
  const [date, setDate] = useState(targetDate || new Date().toISOString().split('T')[0])
  const [dials, setDials] = useState<number>(initialData?.dials || 0)
  
  const [pointsData, setPointsData] = useState<Record<string, number>>(initialData?.pointsData || {})
  const [schedule, setSchedule] = useState<Record<string, string>>(initialData?.schedule || {})
  const [prospecting, setProspecting] = useState<any>(initialData?.prospecting || {
    session1: { start: '', end: '', min: '' },
    session2: { start: '', end: '', min: '' },
    overall: { min: '', contacts: '', listingApts: '', apts: '', lenderApts: '' }
  })
  const [notes, setNotes] = useState(initialData?.notes || '')
  
  const [isSaving, setIsSaving] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (initialData) {
      setDials(initialData.dials || 0)
      setPointsData(initialData.pointsData || {})
      setSchedule(initialData.schedule || {})
      setProspecting(initialData.prospecting || {
        session1: { start: '', end: '', min: '' },
        session2: { start: '', end: '', min: '' },
        overall: { min: '', contacts: '', listingApts: '', apts: '', lenderApts: '' }
      })
      setNotes(initialData.notes || '')
    } else {
      setDials(0)
      setPointsData({})
      setSchedule({})
      setProspecting({
        session1: { start: '', end: '', min: '' },
        session2: { start: '', end: '', min: '' },
        overall: { min: '', contacts: '', listingApts: '', apts: '', lenderApts: '' }
      })
      setNotes('')
    }
  }, [initialData])

  const handlePointChange = (id: string, value: string) => {
    const num = parseInt(value, 10)
    setPointsData(prev => ({ ...prev, [id]: isNaN(num) ? 0 : num }))
  }

  const handleScheduleChange = (time: string, value: string) => {
    setSchedule(prev => ({ ...prev, [time]: value }))
  }

  const handleProspectingChange = (section: string, field: string, value: string) => {
    setProspecting((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  const calculateTotalPoints = () => {
    return ACTIVITIES.reduce((total, activity) => {
      const count = pointsData[activity.id] || 0
      return total + (count * activity.points)
    }, 0)
  }

  const totalPoints = calculateTotalPoints()

  const handleClear = () => {
    if (confirm('Are you sure you want to clear the entire form?')) {
      setDials(0)
      setPointsData({})
      setSchedule({})
      setProspecting({
        session1: { start: '', end: '', min: '' },
        session2: { start: '', end: '', min: '' },
        overall: { min: '', contacts: '', listingApts: '', apts: '', lenderApts: '' }
      })
      setNotes('')
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await saveDailyTracker(agentId, {
        dials,
        pointsData,
        totalPoints,
        schedule,
        prospecting,
        notes,
      }, date)
      alert('Tracker saved successfully!')
    } catch (e) {
      alert('Failed to save tracker.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportPDF = async () => {
    if (!formRef.current) return
    try {
      const canvas = await html2canvas(formRef.current, { scale: 2 })
      const imgData = canvas.toDataURL('image/jpeg', 1.0)
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      const pageHeight = pdf.internal.pageSize.getHeight()
      
      let heightLeft = pdfHeight
      let position = 0
      
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight)
      heightLeft -= pageHeight
      
      while (heightLeft > 0) {
        position = position - pageHeight
        pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight)
        heightLeft -= pageHeight
      }
      
      pdf.save(`Daily_Tracker_${agentName}_${date}.pdf`)
    } catch (e) {
      alert('Failed to generate PDF')
      console.error(e)
    }
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '4rem' }}>
      {!readOnly && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '2rem' }}>
          <button onClick={handleClear} className="btn" style={{ backgroundColor: 'var(--danger)', color: 'white' }}>Clear Form</button>
          <button onClick={handleSave} className="btn btn-secondary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Form'}</button>
          <button onClick={handleExportPDF} className="btn">Email/Export PDF</button>
        </div>
      )}

      <fieldset disabled={readOnly} style={{ border: 'none', padding: 0, margin: 0 }}>
      <div ref={formRef} style={{ backgroundColor: 'white', color: 'black', padding: '3rem', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem', borderBottom: '2px solid #e5e7eb', paddingBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Daily Success Habits Tracker</h1>
          <p style={{ color: '#6b7280', fontSize: '1.25rem' }}>eXp Syndicate Tracker</p>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '4rem', marginTop: '2rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Agent Name</label>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, borderBottom: '1px solid black', padding: '0.25rem 2rem' }}>{agentName}</div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Date</label>
              <input type="date" value={date} onChange={(e) => {
                setDate(e.target.value);
                router.push(`?date=${e.target.value}`);
              }} style={{ fontSize: '1.25rem', fontWeight: 700, border: 'none', borderBottom: '1px solid black', padding: '0.25rem', outline: 'none', fontFamily: 'inherit', color: 'black' }} />
            </div>
          </div>
        </div>

        <div className="form-grid-sidebar" style={{ marginBottom: '3rem' }}>
          <div>
            <div style={{ marginBottom: '3rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem', borderBottom: '2px solid black', paddingBottom: '0.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>61 Points of Rhythm</h2>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: totalPoints >= 61 ? '#10b981' : 'black' }}>
                  {totalPoints} <span style={{ fontSize: '1rem', color: '#6b7280' }}>/ 61 pts</span>
                </div>
              </div>
              
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6', fontSize: '0.875rem', textTransform: 'uppercase', color: '#4b5563' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', width: '50%' }}>Activity</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Points Worth</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Actual</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ACTIVITIES.map(activity => {
                    const count = pointsData[activity.id] || 0
                    return (
                      <tr key={activity.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 500 }}>
                          {activity.label}
                          {activity.unit && <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 'normal' }}>(per {activity.unit})</div>}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', color: '#6b7280' }}>{activity.points}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <input 
                            type="number" 
                            min="0"
                            value={count || ''}
                            onChange={(e) => handlePointChange(activity.id, e.target.value)}
                            style={{ width: '60px', textAlign: 'center', padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                          />
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 700 }}>
                          {count * activity.points}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ marginBottom: '3rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '2px solid black', paddingBottom: '0.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Dials Tracker</h2>
                <div style={{ fontWeight: 700 }}>Total: {dials}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(35px, 1fr))', gap: '0.5rem' }}>
                {Array.from({ length: 50 }, (_, i) => i + 1).map(num => (
                  <div 
                    key={num}
                    onClick={() => setDials(num)}
                    style={{
                      aspectRatio: '1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      backgroundColor: num <= dials ? '#3b82f6' : '#f3f4f6',
                      color: num <= dials ? 'white' : '#9ca3af',
                      border: num <= dials ? 'none' : '1px solid #e5e7eb',
                      transition: 'all 0.1s ease'
                    }}
                  >
                    {num}
                  </div>
                ))}
              </div>
              <button onClick={() => setDials(0)} style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Reset Dials</button>
            </div>

            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '2px solid black', paddingBottom: '0.5rem' }}>Prospecting Times & Totals</h2>
              
              <div className="form-grid-2" style={{ marginBottom: '2rem' }}>
                <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#4b5563' }}>Session 1</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><label style={{ fontSize: '0.875rem', color: '#6b7280' }}>Start Time:</label> <input type="time" value={prospecting.session1.start} onChange={(e) => handleProspectingChange('session1', 'start', e.target.value)} style={{ border: 'none', borderBottom: '1px solid #d1d5db', background: 'transparent', outline: 'none' }}/></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><label style={{ fontSize: '0.875rem', color: '#6b7280' }}>End Time:</label> <input type="time" value={prospecting.session1.end} onChange={(e) => handleProspectingChange('session1', 'end', e.target.value)} style={{ border: 'none', borderBottom: '1px solid #d1d5db', background: 'transparent', outline: 'none' }}/></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><label style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Min Called:</label> <input type="number" value={prospecting.session1.min} onChange={(e) => handleProspectingChange('session1', 'min', e.target.value)} style={{ width: '60px', textAlign: 'right', border: 'none', borderBottom: '1px solid #d1d5db', background: 'transparent', outline: 'none' }}/></div>
                  </div>
                </div>

                <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#4b5563' }}>Session 2</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><label style={{ fontSize: '0.875rem', color: '#6b7280' }}>Start Time:</label> <input type="time" value={prospecting.session2.start} onChange={(e) => handleProspectingChange('session2', 'start', e.target.value)} style={{ border: 'none', borderBottom: '1px solid #d1d5db', background: 'transparent', outline: 'none' }}/></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><label style={{ fontSize: '0.875rem', color: '#6b7280' }}>End Time:</label> <input type="time" value={prospecting.session2.end} onChange={(e) => handleProspectingChange('session2', 'end', e.target.value)} style={{ border: 'none', borderBottom: '1px solid #d1d5db', background: 'transparent', outline: 'none' }}/></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><label style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Min Called:</label> <input type="number" value={prospecting.session2.min} onChange={(e) => handleProspectingChange('session2', 'min', e.target.value)} style={{ width: '60px', textAlign: 'right', border: 'none', borderBottom: '1px solid #d1d5db', background: 'transparent', outline: 'none' }}/></div>
                  </div>
                </div>
              </div>

              <div className="form-grid-2">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: '#111827', color: 'white', borderRadius: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '1.125rem' }}>OVERALL TOTAL MIN:</span>
                  <input type="number" value={prospecting.overall.min} onChange={(e) => handleProspectingChange('overall', 'min', e.target.value)} style={{ width: '80px', fontSize: '1.25rem', fontWeight: 700, textAlign: 'right', background: 'transparent', border: 'none', borderBottom: '1px solid #4b5563', color: 'white', outline: 'none' }}/>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', border: '2px solid black', borderRadius: '8px' }}>
                  <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', margin: 0, borderBottom: '1px solid #e5e7eb', paddingBottom: '0.25rem' }}>Totals</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><label style={{ fontWeight: 600 }}>Contacts:</label> <input type="number" value={prospecting.overall.contacts} onChange={(e) => handleProspectingChange('overall', 'contacts', e.target.value)} style={{ width: '60px', textAlign: 'right', border: 'none', borderBottom: '1px solid #d1d5db', outline: 'none' }}/></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><label style={{ fontWeight: 600 }}>Listing Apts Set:</label> <input type="number" value={prospecting.overall.listingApts} onChange={(e) => handleProspectingChange('overall', 'listingApts', e.target.value)} style={{ width: '60px', textAlign: 'right', border: 'none', borderBottom: '1px solid #d1d5db', outline: 'none' }}/></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><label style={{ fontWeight: 600 }}>Apts:</label> <input type="number" value={prospecting.overall.apts} onChange={(e) => handleProspectingChange('overall', 'apts', e.target.value)} style={{ width: '60px', textAlign: 'right', border: 'none', borderBottom: '1px solid #d1d5db', outline: 'none' }}/></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><label style={{ fontWeight: 600 }}>Lender Apts Set:</label> <input type="number" value={prospecting.overall.lenderApts} onChange={(e) => handleProspectingChange('overall', 'lenderApts', e.target.value)} style={{ width: '60px', textAlign: 'right', border: 'none', borderBottom: '1px solid #d1d5db', outline: 'none' }}/></div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '2px solid black', paddingBottom: '0.5rem' }}>Daily Schedule</h2>
              <div style={{ flex: 1, backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {TIME_BLOCKS.map(time => (
                  <div key={time} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{ width: '65px', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textAlign: 'right' }}>{time}</div>
                    <input 
                      type="text" 
                      value={schedule[time] || ''}
                      onChange={(e) => handleScheduleChange(time, e.target.value)}
                      style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.875rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '2px solid black', paddingBottom: '0.5rem' }}>To Do's & Notes</h2>
          <textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ width: '100%', height: '150px', padding: '1rem', fontSize: '1rem', border: '1px solid #d1d5db', borderRadius: '8px', resize: 'vertical' }}
            placeholder="Write your notes here..."
          />
        </div>
      </div>
      </fieldset>
    </div>
  )
}
