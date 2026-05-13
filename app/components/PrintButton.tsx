'use client'

export default function PrintButton() {
  return (
    <button 
      onClick={() => window.print()} 
      className="btn" 
      style={{ backgroundColor: 'var(--accent-primary)' }}
    >
      Print Invoice
    </button>
  )
}
