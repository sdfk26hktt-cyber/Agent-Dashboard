import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function AgentsList() {
  const allAgents = await prisma.agent.findMany({
    include: {
      supervisor: {
        include: { showingPartners: true }
      },
      showingPartners: true,
      deals: true,
    },
    orderBy: { role: 'asc' }
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>All Agents</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Directory of all Team Agents and Showing Partners.</p>
        </div>
        <Link href="/agents/new" className="btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Add Agent
        </Link>
      </div>

      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Name</th>
              <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Role</th>
              <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Supervisor</th>
              <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Start Date</th>
              <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Points</th>
              <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {allAgents.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No agents found.
                </td>
              </tr>
            ) : (
              allAgents.map(agent => {
                let points = 0;
                if (agent.role === 'SHOWING_PARTNER') {
                  const monthsServed = Math.max(0, (new Date().getTime() - new Date(agent.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
                  const databankDeals = agent.deals.filter(d => d.type === 'DATABANK').length;
                  const soiDeals = agent.deals.filter(d => d.type === 'SOI').length;
                  points = (monthsServed * 1.5) + (databankDeals * 1.2) + (soiDeals * 2.4);
                }

                let isFirstSp = false;
                if (agent.role === 'SHOWING_PARTNER' && agent.supervisor) {
                  const overriddenSp = agent.supervisor.showingPartners.find(sp => sp.isFirstSpOverride);
                  if (overriddenSp) {
                    isFirstSp = overriddenSp.id === agent.id;
                  } else if (agent.supervisor.showingPartners.length > 0) {
                    const sortedPartners = [...agent.supervisor.showingPartners].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
                    isFirstSp = sortedPartners[0].id === agent.id;
                  }
                }

                return (
                  <tr key={agent.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {agent.name}
                        {isFirstSp && (
                          <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#d97706', fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
                            1st SP
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className={`badge ${agent.role === 'TEAM_AGENT' ? 'badge-green' : 'badge-blue'}`}>
                        {agent.role === 'TEAM_AGENT' ? 'Team Agent' : 'Showing Partner'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                      {agent.supervisor?.name || '-'}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                      {new Date(agent.startDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {agent.role === 'SHOWING_PARTNER' ? `${points.toFixed(1)} / 25` : '-'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <Link href={`/agents/${agent.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>
                        View Profile
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
