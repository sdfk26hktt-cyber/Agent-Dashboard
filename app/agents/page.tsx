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

      <AgentsTableClient agents={allAgents} />
    </div>
  )
}
