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
    where: { role: 'TEAM_AGENT', isActive: true },
    include: {
      showingPartners: {
        include: {
          deals: true,
        }
      }
    }
  })
  const allShowingPartners = await prisma.agent.findMany({
    where: { role: 'SHOWING_PARTNER', isActive: true },
    include: { deals: true }
  });

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  let currentMonthDealsCount = 0;
  let currentMonthGrossCommission = 0;

  for (const sp of allShowingPartners) {
    for (const deal of sp.deals) {
      const dealDate = new Date(deal.dateClosed);
      if (dealDate.getMonth() === currentMonth && dealDate.getFullYear() === currentYear) {
        currentMonthDealsCount++;
        if (deal.salesPrice && deal.commissionPercentage) {
           const totalComm = deal.salesPrice * (deal.commissionPercentage / 100);
           const referralCost = totalComm * ((deal.referralPercentage || 0) / 100);
           const netComm = totalComm - referralCost;
           currentMonthGrossCommission += netComm;
        }
      }
    }
  }

  const targetDeals = 2 * allShowingPartners.length;
  const targetGci = 28000 * allShowingPartners.length;

  const dealsPercentage = targetDeals > 0 ? Math.min(100, (currentMonthDealsCount / targetDeals) * 100) : 0;
  const gciPercentage = targetGci > 0 ? Math.min(100, (currentMonthGrossCommission / targetGci) * 100) : 0;

  const CircleProgress = ({ percentage, text, subtext, color }: { percentage: number, text: string, subtext: string, color: string }) => {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} stroke="var(--border-color)" strokeWidth="10" fill="none" />
          <circle cx="60" cy="60" r={radius} stroke={color} strokeWidth="10" fill="none" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" transform="rotate(-90 60 60)" />
        </svg>
        <div style={{ marginTop: '-85px', textAlign: 'center', height: '85px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{text}</span>
        </div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '150px' }}>{subtext}</div>
      </div>
    );
  };

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
      <div className="card" style={{ marginBottom: '2rem', display: 'flex', gap: '3rem', justifyContent: 'center', padding: '2rem' }}>
        <CircleProgress 
          percentage={dealsPercentage} 
          text={`${currentMonthDealsCount} / ${targetDeals}`} 
          subtext="Monthly SP Deals Goal" 
          color="#3b82f6" 
        />
        <CircleProgress 
          percentage={gciPercentage} 
          text={`$${(currentMonthGrossCommission / 1000).toFixed(1)}k / $${(targetGci / 1000).toFixed(0)}k`} 
          subtext="Monthly SP GCI Goal" 
          color="#10b981" 
        />
      </div>

      <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 350px), 1fr))' }}>
        {teamAgents.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>No Team Agents found.</p>
            <Link href="/agents/new" className="btn btn-secondary">Create your first Team Agent</Link>
          </div>
        ) : (
          (() => {
            const teamAgentsWithGci = teamAgents.map(agent => {
              let currentMonthNetGci = 0;
              
              for (const sp of agent.showingPartners) {
                for (const d of sp.deals) {
                  const dealDate = new Date(d.dateClosed);
                  if (dealDate.getMonth() === currentMonth && dealDate.getFullYear() === currentYear) {
                    if (d.salesPrice && d.commissionPercentage) {
                      const gross = d.salesPrice * (d.commissionPercentage / 100);
                      const net = gross * (1 - ((d.referralPercentage || 0) / 100));
                      currentMonthNetGci += net;
                    }
                  }
                }
              }

              const currentShowingPartners = agent.showingPartners.filter(sp => sp.role === 'SHOWING_PARTNER').map(sp => {
                const monthsServed = Math.max(0, (new Date().getTime() - new Date(sp.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
                const databankDeals = sp.deals.filter(d => d.type === 'DATABANK').length;
                const soiDeals = sp.deals.filter(d => d.type === 'SOI').length;
                const points = (monthsServed * 1.5) + (databankDeals * 1.2) + (soiDeals * 2.4);
                
                let totalNetGci = 0;
                for (const d of sp.deals) {
                  if (d.salesPrice && d.commissionPercentage) {
                    const gross = d.salesPrice * (d.commissionPercentage / 100);
                    const net = gross * (1 - ((d.referralPercentage || 0) / 100));
                    totalNetGci += net;
                  }
                }

                return { ...sp, points, totalNetGci };
              }).sort((a, b) => b.points - a.points);

              const currentEmpireBuilders = agent.showingPartners.filter(sp => sp.role === 'EMPIRE_BUILDER').map(eb => {
                let ebCurrentMonthNetGci = 0;
                for (const d of eb.deals) {
                  const dealDate = new Date(d.dateClosed);
                  if (dealDate.getMonth() === currentMonth && dealDate.getFullYear() === currentYear) {
                    if (d.salesPrice && d.commissionPercentage) {
                      const gross = d.salesPrice * (d.commissionPercentage / 100);
                      const net = gross * (1 - ((d.referralPercentage || 0) / 100));
                      ebCurrentMonthNetGci += net;
                    }
                  }
                }
                return { ...eb, currentMonthNetGci: ebCurrentMonthNetGci };
              }).sort((a, b) => b.currentMonthNetGci - a.currentMonthNetGci);

              return { ...agent, currentMonthNetGci, currentShowingPartners, currentEmpireBuilders };
            }).sort((a, b) => b.currentMonthNetGci - a.currentMonthNetGci);

            return teamAgentsWithGci.map(agent => {
              const { currentShowingPartners, currentEmpireBuilders } = agent;

              return (
                <div key={agent.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <div>
                    <Link href={`/agents/${agent.id}`}>
                      <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem', color: 'var(--accent-primary)', textDecoration: 'underline' }}>
                        {agent.name}
                      </h2>
                    </Link>
                    <span className={`badge ${agent.role === 'EMPIRE_BUILDER' ? 'badge-red' : 'badge-green'}`}>
                      {agent.role === 'EMPIRE_BUILDER' ? 'Empire Builder' : 'Team Agent'}
                    </span>
                  </div>
                </div>
                
                <h3 className="label">Showing Partners ({currentShowingPartners.length})</h3>
                
                {currentShowingPartners.length === 0 ? (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>No showing partners assigned.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    {currentShowingPartners.map(sp => {
                      const progress = Math.min(100, (sp.points / 25) * 100);

                      return (
                        <Link href={`/agents/${sp.id}`} key={sp.id} style={{ display: 'block', padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', transition: 'border-color 0.2s ease' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <strong>{sp.name}</strong>
                              <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#059669', fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
                                ${sp.totalNetGci.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Net GCI
                              </span>
                            </div>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{sp.points.toFixed(1)} / 25 pts</span>
                          </div>
                          <div className="progress-bar-container">
                            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}

                {currentEmpireBuilders.length > 0 && (
                  <>
                    <h3 className="label" style={{ marginTop: '1.5rem' }}>Empire Builders ({currentEmpireBuilders.length})</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                      {currentEmpireBuilders.map(eb => {
                        const progress = Math.min(100, (eb.currentMonthNetGci / 28000) * 100);

                        return (
                          <Link href={`/agents/${eb.id}`} key={eb.id} style={{ display: 'block', padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', transition: 'border-color 0.2s ease' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <strong>{eb.name}</strong>
                              </div>
                              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>${eb.currentMonthNetGci.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} / $28,000 Bonus</span>
                            </div>
                            <div className="progress-bar-container">
                              <div className="progress-bar-fill" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #f87171, #ef4444)' }}></div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )
          })})()
        )}
      </div>
    </div>
  )
}
