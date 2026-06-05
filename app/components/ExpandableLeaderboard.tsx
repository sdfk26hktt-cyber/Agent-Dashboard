'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ExpandableLeaderboard({ title, data, valueFormatter }: { title: string, data: any[], valueFormatter?: (val: number) => string }) {
  const [expanded, setExpanded] = useState(false);
  
  const displayData = expanded ? data : data.slice(0, 5);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
        {displayData.map((agent, index) => (
          <div key={agent.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              width: '28px', 
              height: '28px', 
              borderRadius: '50%', 
              backgroundColor: index < 3 ? 'var(--accent-primary)' : 'var(--bg-secondary)', 
              color: index < 3 ? 'white' : 'var(--text-secondary)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '0.875rem',
              fontWeight: 'bold'
            }}>
              {index + 1}
            </div>
            <div style={{ flex: 1 }}>
              <Link href={`/agents/${agent.id}`} style={{ fontWeight: '500', color: 'var(--text-primary)', textDecoration: 'none' }} className="hover-underline">
                {agent.name}
              </Link>
            </div>
            <div style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>
              {valueFormatter ? valueFormatter(agent.value) : agent.value}
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center', fontStyle: 'italic', padding: '1rem 0' }}>No data available</div>
        )}
      </div>
      {data.length > 5 && (
        <button 
          onClick={() => setExpanded(!expanded)}
          style={{ 
            marginTop: '1.5rem', 
            padding: '0.5rem', 
            width: '100%', 
            backgroundColor: 'var(--bg-secondary)', 
            border: 'none', 
            borderRadius: '4px', 
            color: 'var(--text-primary)', 
            cursor: 'pointer',
            fontWeight: '500',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
        >
          {expanded ? 'Show Top 5 Only' : `Show All ${data.length} Agents`}
        </button>
      )}
    </div>
  )
}
