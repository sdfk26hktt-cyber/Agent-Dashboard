export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import AgentsTableClient from '@/app/components/AgentsTableClient'

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

  const showingPartnersCount = allAgents.filter(a => a.role === 'SHOWING_PARTNER').length
  const teamAgentsCount = allAgents.filter(a => a.role === 'TEAM_AGENT').length
  const empireBuildersCount = allAgents.filter(a => a.role === 'EMPIRE_BUILDER').length

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{showingPartnersCount}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.5rem' }}>Showing Partners</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{teamAgentsCount}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.5rem' }}>Team Agents</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#475569' }}>{empireBuildersCount}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.5rem' }}>Empire Builders</div>
        </div>
      </div>
      <AgentsTableClient agents={allAgents} />
    </div>
  )
}
