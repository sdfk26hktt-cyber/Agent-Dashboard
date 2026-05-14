import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'

export default async function Dashboard() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'ADMIN') {
    redirect(`/agents/${session.user.id}`)
  }

  const teamAgents = await prisma.agent.findMany({
    where: { role: 'TEAM_AGENT' },
    include: {
      showingPartners: {
        include: {
          deals: true,
        }
      }
    }
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Overview of Team Agents and their Showing Partners</p>
        </div>
        <Link href="/agents/new" className="btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Add Agent
        </Link>
      </div>

      <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
        {teamAgents.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>No Team Agents found.</p>
            <Link href="/agents/new" className="btn btn-secondary">Create your first Team Agent</Link>
          </div>
        ) : (
          teamAgents.map(agent => {
            const overriddenSp = agent.showingPartners.find(sp => sp.isFirstSpOverride);
            const sortedPartners = [...agent.showingPartners].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
            const firstSpId = overriddenSp ? overriddenSp.id : (sortedPartners.length > 0 ? sortedPartners[0].id : null);
            
            const currentShowingPartners = agent.showingPartners.filter(sp => sp.role === 'SHOWING_PARTNER');

            return (
              <div key={agent.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <div>
                    <Link href={`/agents/${agent.id}`}>
                      <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem', color: 'var(--accent-primary)', textDecoration: 'underline' }}>
                        {agent.name}
                      </h2>
                    </Link>
                    <span className="badge badge-blue">Team Agent</span>
                  </div>
                </div>
                
                <h3 className="label">Showing Partners ({currentShowingPartners.length})</h3>
                
                {currentShowingPartners.length === 0 ? (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>No showing partners assigned.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    {currentShowingPartners.map(sp => {
                      // Calculate basic points for display
                      const monthsServed = Math.max(0, (new Date().getTime() - new Date(sp.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
                      const databankDeals = sp.deals.filter(d => d.type === 'DATABANK').length;
                      const soiDeals = sp.deals.filter(d => d.type === 'SOI').length;
                      
                      const points = (monthsServed * 1.5) + (databankDeals * 1.2) + (soiDeals * 2.4);
                      const progress = Math.min(100, (points / 25) * 100);
                      const isFirstSp = sp.id === firstSpId;

                      return (
                        <Link href={`/agents/${sp.id}`} key={sp.id} style={{ display: 'block', padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', transition: 'border-color 0.2s ease' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <strong>{sp.name}</strong>
                              {isFirstSp && (
                                <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#d97706', fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
                                  1st SP (Cost Offset)
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{points.toFixed(1)} / 25 pts</span>
                          </div>
                          <div className="progress-bar-container">
                            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
