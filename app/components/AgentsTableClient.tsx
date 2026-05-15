'use client'

import { useState } from 'react'
import Link from 'next/link'

type SortField = 'name' | 'role' | 'supervisor' | 'startDate' | 'points'
type SortDirection = 'asc' | 'desc'

export default function AgentsTableClient({ agents }: { agents: any[] }) {
  const [sortField, setSortField] = useState<SortField>('role')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const processedAgents = agents.map(agent => {
    let points = 0;
    if (agent.role === 'SHOWING_PARTNER') {
      const monthsServed = Math.max(0, (new Date().getTime() - new Date(agent.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
      const databankDeals = agent.deals?.filter((d: any) => d.type === 'DATABANK').length || 0;
      const soiDeals = agent.deals?.filter((d: any) => d.type === 'SOI').length || 0;
      points = (monthsServed * 1.5) + (databankDeals * 1.2) + (soiDeals * 2.4);
    }

    let isFirstSp = false;
    if (agent.role === 'SHOWING_PARTNER' && agent.supervisor && !agent.supervisor.disableFirstSpCredit) {
      const overriddenSp = agent.supervisor.showingPartners?.find((sp: any) => sp.isFirstSpOverride);
      if (overriddenSp) {
        isFirstSp = overriddenSp.id === agent.id;
      } else if (agent.supervisor.showingPartners && agent.supervisor.showingPartners.length > 0) {
        const sortedPartners = [...agent.supervisor.showingPartners].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        isFirstSp = sortedPartners[0].id === agent.id;
      }
    }

    return { ...agent, points, isFirstSp }
  })

  const sortedAgents = [...processedAgents].sort((a, b) => {
    let valA: any = a[sortField]
    let valB: any = b[sortField]

    if (sortField === 'supervisor') {
      valA = a.supervisor?.name || ''
      valB = b.supervisor?.name || ''
    } else if (sortField === 'startDate') {
      valA = new Date(a.startDate).getTime()
      valB = new Date(b.startDate).getTime()
    } else if (sortField === 'points') {
      valA = a.points
      valB = b.points
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <span style={{ opacity: 0.3, marginLeft: '4px' }}>↕</span>
    return sortDirection === 'asc' ? <span style={{ marginLeft: '4px' }}>↑</span> : <span style={{ marginLeft: '4px' }}>↓</span>
  }

  return (
    <div className="card">
      <div className="table-responsive">
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
              <th onClick={() => handleSort('name')} style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}>
                Name {getSortIcon('name')}
              </th>
              <th onClick={() => handleSort('role')} style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}>
                Role {getSortIcon('role')}
              </th>
              <th onClick={() => handleSort('supervisor')} style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}>
                Supervisor {getSortIcon('supervisor')}
              </th>
              <th onClick={() => handleSort('startDate')} style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}>
                Start Date {getSortIcon('startDate')}
              </th>
              <th onClick={() => handleSort('points')} style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}>
                Points {getSortIcon('points')}
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedAgents.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No agents found.
                </td>
              </tr>
            ) : (
              sortedAgents.map(agent => (
                <tr key={agent.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {agent.name}
                      {agent.isFirstSp && (
                        <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#d97706', fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
                          1st SP
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className={`badge ${agent.role === 'TEAM_AGENT' ? 'badge-green' : agent.role === 'EMPIRE_BUILDER' ? 'badge-slate' : 'badge-blue'}`}>
                      {agent.role === 'TEAM_AGENT' ? 'Team Agent' : agent.role === 'EMPIRE_BUILDER' ? 'Empire Builder' : 'Showing Partner'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                    {agent.supervisor?.name || '-'}
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                    {new Date(agent.startDate).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {agent.role === 'SHOWING_PARTNER' ? `${agent.points.toFixed(1)} / 25` : '-'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <Link href={`/agents/${agent.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>
                      View Profile
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
