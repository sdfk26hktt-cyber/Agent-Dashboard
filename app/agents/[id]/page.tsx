export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { addDeal, graduateAgent, convertToEmpireBuilder, updatePassword } from '@/app/actions'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import DeleteAgentButton from '@/app/components/DeleteAgentButton'
import AdminDealActions from '@/app/components/AdminDealActions'
import AdminEditProfileForm from '@/app/components/AdminEditProfileForm'
import PointsBreakdownChart from '@/app/components/charts/PointsBreakdownChart'
import GciHistoryChart from '@/app/components/charts/GciHistoryChart'
import SalesVolumeChart from '@/app/components/charts/SalesVolumeChart'
import ProspectTracker from '@/app/components/ProspectTracker'
import DailyTrackerGamification from '@/app/components/DailyTrackerGamification'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export default async function AgentProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const isAdmin = session.user.role === 'ADMIN'

  // Defer auth check until after we check supervisor access
  let isAuthorized = false;
  if (isAdmin || session.user.id === id) {
    isAuthorized = true;
  } else if (session.user.role === 'EMPIRE_BUILDER') {
    const loggedInAgent = await prisma.agent.findUnique({ where: { id: session.user.id } });
    if (loggedInAgent?.supervisorId === id) {
      isAuthorized = true;
    }
  } else if (session.user.role === 'TEAM_AGENT') {
    const targetAgent = await prisma.agent.findUnique({ where: { id } });
    if (targetAgent?.supervisorId === session.user.id) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) redirect('/')

  const currentMonthStart = new Date();
  currentMonthStart.setDate(1);
  currentMonthStart.setHours(0, 0, 0, 0);

  const agent = await prisma.agent.findUnique({
    where: { id },
    include: {
      supervisor: true,
      deals: {
        orderBy: { dateClosed: 'desc' }
      },
      gciEntries: {
        orderBy: { month: 'desc' }
      },
      prospects: {
        orderBy: { createdAt: 'desc' }
      },
      showingPartners: {
        include: {
          deals: true
        }
      },
      dailyTrackers: {
        orderBy: { date: 'desc' }
      }
    }
  })

  if (!agent) notFound()

  const isShowingPartner = agent.role === 'SHOWING_PARTNER'
  const isEmpireBuilder = agent.role === 'EMPIRE_BUILDER'
  const isBonusEligible = isShowingPartner || isEmpireBuilder

  // Ledger calculation for Team Agents
  let allCosts: any[] = [];
  const ledgerMap = new Map<string, { month: Date, totalCost: number, overrideCredit: number, netAmount: number, totalGci: number }>();
  if (!isShowingPartner) {
    allCosts = await prisma.costEntry.findMany({
      where: { showingPartner: { supervisorId: id } },
      include: { showingPartner: true },
      orderBy: { month: 'desc' }
    });

    for (const gci of agent.gciEntries) {
      const monthKey = gci.month.toISOString().substring(0, 7);
      if (!ledgerMap.has(monthKey)) {
        ledgerMap.set(monthKey, { month: gci.month, totalCost: 0, overrideCredit: 0, netAmount: 0, totalGci: 0 });
      }
      const entry = ledgerMap.get(monthKey)!;
      const credit = gci.amount * 0.095;
      entry.overrideCredit += credit;
      entry.netAmount -= credit;
      entry.totalGci += gci.amount;
    }

    for (const cost of allCosts) {
      const monthKey = cost.month.toISOString().substring(0, 7);
      if (!ledgerMap.has(monthKey)) {
        ledgerMap.set(monthKey, { month: cost.month, totalCost: 0, overrideCredit: 0, netAmount: 0, totalGci: 0 });
      }
      const entry = ledgerMap.get(monthKey)!;
      entry.totalCost += cost.supervisorShare;
      entry.netAmount += cost.supervisorShare;
    }
  }
  const ledgerArray = Array.from(ledgerMap.values()).sort((a, b) => b.month.getTime() - a.month.getTime());

  // Calculate Points
  const monthsServed = Math.max(0, (new Date().getTime() - new Date(agent.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
  const databankDeals = agent.deals.filter(d => d.type === 'DATABANK').length;
  const soiDeals = agent.deals.filter(d => d.type === 'SOI').length;
  
  const pointsFromTenure = monthsServed * 1.5;
  const pointsFromDatabank = databankDeals * 1.2;
  const pointsFromSoi = soiDeals * 2.4;
  const totalPoints = pointsFromTenure + pointsFromDatabank + pointsFromSoi;

  const threshold = 25;
  const progress = Math.min(100, (totalPoints / threshold) * 100);
  const canGraduate = isShowingPartner && totalPoints >= threshold;

  // Bonus Calculation
  
  let currentMonthGci = 0;
  if (isBonusEligible) {
    const currentMonthDeals = agent.deals.filter(d => new Date(d.dateClosed) >= currentMonthStart);
    currentMonthGci = currentMonthDeals.reduce((acc, d) => {
      if (d.salesPrice && d.commissionPercentage) {
        const totalComm = d.salesPrice * (d.commissionPercentage / 100);
        const referralCost = totalComm * ((d.referralPercentage || 0) / 100);
        const netComm = totalComm - referralCost;
        return acc + netComm;
      }
      return acc;
    }, 0);
  }
  const bonusThreshold = 28000;
  const bonusProgress = Math.min(100, (currentMonthGci / bonusThreshold) * 100);

  // Since Next.js requires server actions to be passed properly or defined inline carefully,
  // we use a bound action for addDeal.
  const addDealAction = addDeal.bind(null, agent.id);
  const graduateAction = graduateAgent.bind(null, agent.id);
  const convertEmpireAction = convertToEmpireBuilder.bind(null, agent.id);
  const updatePasswordAction = updatePassword.bind(null, agent.id);

  // Gamification Calculations
  let dailyPoints = 0;
  let weeklyPoints = 0;
  let monthlyPoints = 0;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Calculate start of week (Monday)
  const currentDay = now.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay; // if Sunday (0), go back 6 days
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() + diffToMonday);

  // Calculate weekdays in current month
  let weekdaysInMonth = 0;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), i).getDay();
    if (day !== 0 && day !== 6) weekdaysInMonth++;
  }
  const monthlyTarget = weekdaysInMonth * 61;

  const currentMonthStartLocal = new Date(now.getFullYear(), now.getMonth(), 1);

  for (const dt of agent.dailyTrackers) {
    const dtDate = new Date(dt.date);
    const dtDateStart = new Date(dtDate.getFullYear(), dtDate.getMonth(), dtDate.getDate());
    
    if (dtDateStart >= currentMonthStartLocal) {
      monthlyPoints += dt.totalPoints;
    }
    
    if (dtDateStart >= weekStart) {
      weeklyPoints += dt.totalPoints;
    }
    
    if (dtDateStart.getTime() === todayStart.getTime()) {
      dailyPoints += dt.totalPoints;
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/" style={{ color: 'var(--accent-primary)', fontSize: '0.875rem' }}>&larr; Back to Dashboard</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '1rem' }}>
          <div>
            <h1 style={{ marginBottom: '0.5rem' }}>{agent.name}</h1>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span className={`badge ${agent.role === 'TEAM_AGENT' ? 'badge-green' : agent.role === 'EMPIRE_BUILDER' ? 'badge-red' : agent.role === 'ADMIN' ? 'badge-purple' : 'badge-blue'}`}>
                {agent.role === 'TEAM_AGENT' ? 'Team Agent' : agent.role === 'EMPIRE_BUILDER' ? 'Empire Builder' : agent.role === 'ADMIN' ? 'Admin' : 'Showing Partner'}
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Started: {new Date(agent.startDate).toLocaleDateString()}</span>
            </div>
            {agent.supervisor && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Supervised by {agent.supervisor.name}</p>
            )}
            {agent.graduatedAt && (
              <p style={{ color: 'var(--success)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Graduated on {new Date(agent.graduatedAt).toLocaleDateString()}</p>
            )}
          </div>

          {canGraduate && (
            <form action={graduateAction}>
              <button type="submit" className="btn" style={{ backgroundColor: 'var(--success)' }}>
                Graduate to Team Agent
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="profile-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <DailyTrackerGamification dailyPoints={dailyPoints} weeklyPoints={weeklyPoints} monthlyPoints={monthlyPoints} monthlyTarget={monthlyTarget} />
          
          {isBonusEligible && (
            <div className="card">
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Current Month Bonus Progress</h2>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600 }}>Total GCI Generated</span>
                <span>${currentMonthGci.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${bonusThreshold.toLocaleString()}</span>
              </div>
              <div className="progress-bar-container" style={{ height: '16px', marginBottom: '2rem' }}>
                <div className="progress-bar-fill" style={{ width: `${bonusProgress}%` }}></div>
              </div>
              {currentMonthGci >= bonusThreshold && (
                <div style={{ padding: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '8px', fontWeight: 500, textAlign: 'center' }}>
                  🎉 $1,500 Bonus Achieved!
                </div>
              )}
              {currentMonthGci < bonusThreshold && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center' }}>
                  Generate ${(bonusThreshold - currentMonthGci).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} more GCI this month to earn the $1,500 bonus.
                </p>
              )}
            </div>
          )}

          {isShowingPartner && (
            <div className="card">
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Graduation Progress</h2>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600 }}>Total Points</span>
                <span>{totalPoints.toFixed(1)} / {threshold}</span>
              </div>
              <div className="progress-bar-container" style={{ height: '16px', marginBottom: '2rem' }}>
                <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
              </div>

              <div className="form-grid-3">
                <div style={{ padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Tenure (1.5/mo)</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{pointsFromTenure.toFixed(1)}</div>
                </div>
                <div style={{ padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Databank (1.2/dl)</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{pointsFromDatabank.toFixed(1)}</div>
                </div>
                <div style={{ padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>SOI (2.4/dl)</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{pointsFromSoi.toFixed(1)}</div>
                </div>
              </div>

              <div style={{ marginTop: '2rem' }}>
                <PointsBreakdownChart tenure={pointsFromTenure} databank={pointsFromDatabank} soi={pointsFromSoi} />
              </div>

              <ProspectTracker agentId={agent.id} currentPoints={totalPoints} prospects={agent.prospects} />
            </div>
          )}

          {isEmpireBuilder && (
            <div className="card">
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Sales Volume History</h2>
              <SalesVolumeChart deals={agent.deals} />
            </div>
          )}

          {(!isShowingPartner && !isEmpireBuilder) && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem' }}>Gross Commission Income (GCI)</h2>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Active Showing Partners Status</h3>
                  {agent.showingPartners.filter(sp => sp.role === 'SHOWING_PARTNER').length === 0 ? (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No active showing partners.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {agent.showingPartners.filter(sp => sp.role === 'SHOWING_PARTNER').map(sp => {
                        const monthsDiff = (new Date().getTime() - new Date(sp.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
                        const tenurePoints = Math.max(0, monthsDiff) * 1.5
                        const dealPoints = sp.deals.reduce((acc: number, deal: any) => acc + (deal.type === 'DATABANK' ? 1.2 : 2.4), 0)
                        const totalPts = tenurePoints + dealPoints
                        const progress = Math.min(100, (totalPts / 25) * 100)

                        let totalNetGci = 0;
                        for (const d of sp.deals) {
                          if (d.salesPrice && d.commissionPercentage) {
                            const gross = d.salesPrice * (d.commissionPercentage / 100);
                            const net = gross * (1 - ((d.referralPercentage || 0) / 100));
                            totalNetGci += net;
                          }
                        }

                        return (
                          <div key={sp.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Link href={`/agents/${sp.id}`} style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)' }}>
                                  {sp.name}
                                </Link>
                                <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#059669', fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
                                  ${totalNetGci.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Net GCI
                                </span>
                              </div>
                              <span style={{ fontSize: '0.875rem', color: totalPts >= 25 ? 'var(--success)' : 'var(--text-secondary)', fontWeight: totalPts >= 25 ? 600 : 400 }}>
                                {totalPts.toFixed(1)} / 25 pts
                              </span>
                            </div>
                            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${progress}%`, height: '100%', background: totalPts >= 25 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }} />
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                              {sp.deals.length} Deals Logged
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div style={{ padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Graduated Showing Partners</h3>
                  {agent.showingPartners.filter(sp => sp.role === 'TEAM_AGENT').length === 0 ? (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No graduated partners yet.</p>
                  ) : (
                    <ul style={{ paddingLeft: '1.5rem', fontSize: '0.875rem' }}>
                      {agent.showingPartners.filter(sp => sp.role === 'TEAM_AGENT').map(sp => (
                        <li key={sp.id} style={{ marginBottom: '0.25rem' }}>
                          <Link href={`/agents/${sp.id}`} style={{ color: 'var(--primary)' }}>
                            {sp.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div style={{ padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Empire Builders</h3>
                  {agent.showingPartners.filter(sp => sp.role === 'EMPIRE_BUILDER').length === 0 ? (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No Empire Builders yet.</p>
                  ) : (
                    <ul style={{ paddingLeft: '1.5rem', fontSize: '0.875rem' }}>
                      {agent.showingPartners.filter(sp => sp.role === 'EMPIRE_BUILDER').map(sp => (
                        <li key={sp.id} style={{ marginBottom: '0.25rem' }}>
                          <Link href={`/agents/${sp.id}`} style={{ color: 'var(--primary)' }}>
                            {sp.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Monthly Ledger & Invoices</h3>
              {ledgerArray.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <GciHistoryChart data={ledgerArray.slice(0, 12).map(entry => ({ month: entry.month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), gci: entry.totalGci }))} />
                </div>
              )}
              {ledgerArray.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No ledger data available yet.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem' }}>Month</th>
                      <th style={{ padding: '0.5rem' }}>SP Costs</th>
                      <th style={{ padding: '0.5rem' }}>Total Credits</th>
                      <th style={{ padding: '0.5rem' }}>Net Balance</th>
                      <th style={{ padding: '0.5rem' }}>Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerArray.slice(0, 12).map(entry => (
                      <tr key={entry.month.toISOString()} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.5rem' }}>{entry.month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</td>
                        <td style={{ padding: '0.5rem' }}>${entry.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style={{ padding: '0.5rem', color: 'var(--success)' }}>-${entry.overrideCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style={{ padding: '0.5rem', fontWeight: 600 }}>${entry.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style={{ padding: '0.5rem' }}>
                          <Link href={`/agents/${agent.id}/invoice?month=${entry.month.toISOString().substring(0, 7)}`} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                            View Invoice
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          <div className="card">
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Closed Deals</h2>
              {agent.deals.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No deals logged yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {agent.deals.map(deal => (
                    <div key={deal.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>
                          {deal.address}
                          {deal.clientName && <span style={{ fontWeight: 'normal', color: 'var(--text-secondary)' }}> - {deal.clientName}</span>}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          {new Date(deal.dateClosed).toLocaleDateString()}
                          {deal.salesPrice && ` | $${deal.salesPrice.toLocaleString()}`}
                          {deal.commissionPercentage && ` (${deal.commissionPercentage}%)`}
                          {deal.referralPercentage && deal.referralPercentage > 0 ? ` | -${deal.referralPercentage}% Ref` : ''}
                        </div>
                      </div>
                      <span className={`badge ${deal.type === 'DATABANK' ? 'badge-blue' : 'badge-green'}`}>
                        {deal.type}
                      </span>
                      {isAdmin && (
                        <AdminDealActions deal={deal} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card" style={{ marginTop: '2rem' }}>
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Daily Activities History</h2>
              {agent.dailyTrackers.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No daily trackers saved yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {agent.dailyTrackers.map(tracker => (
                    <div key={tracker.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>
                          {new Date(tracker.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          {tracker.totalPoints} points • {tracker.dials} dials
                        </div>
                      </div>
                      <Link href={`/daily-tracker/${tracker.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>
                        View Sheet
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </div>

        <div>
          {agent.role !== 'TEAM_AGENT' && (
            <div className="card" style={{ marginBottom: '2rem' }}>
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Log New Deal</h2>
              <form action={addDealAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="label" htmlFor="address">Property Address</label>
                  <input type="text" id="address" name="address" className="input" required placeholder="123 Main St" />
                </div>
                <div>
                  <label className="label" htmlFor="type">Deal Type</label>
                  <select id="type" name="type" className="input" required>
                    <option value="DATABANK">Databank {isShowingPartner ? '(1.2 pts)' : ''}</option>
                    <option value="SOI">Sphere of Influence {isShowingPartner ? '(2.4 pts)' : ''}</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="clientName">Client Name (Optional)</label>
                  <input type="text" id="clientName" name="clientName" className="input" placeholder="John Doe" />
                </div>
                <div className="form-grid-3">
                  <div>
                    <label className="label" htmlFor="salesPrice">Sales Price ($)</label>
                    <input type="number" id="salesPrice" name="salesPrice" className="input" step="0.01" placeholder="250000" />
                  </div>
                  <div>
                    <label className="label" htmlFor="commissionPercentage">Commission (%)</label>
                    <input type="number" id="commissionPercentage" name="commissionPercentage" className="input" step="0.01" placeholder="3.0" />
                  </div>
                  <div>
                    <label className="label" htmlFor="referralPercentage">Referral (%)</label>
                    <input type="number" id="referralPercentage" name="referralPercentage" className="input" step="0.01" placeholder="0" defaultValue="0" />
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="dateClosed">Date Closed</label>
                  <input type="date" id="dateClosed" name="dateClosed" className="input" required defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
                <button type="submit" className="btn" style={{ marginTop: '0.5rem' }}>Save Deal</button>
              </form>
            </div>
          )}

          {session.user.id === agent.id && (
            <div className="card" style={{ marginTop: '2rem' }}>
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Security Settings</h2>
              <form action={updatePasswordAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
                <div>
                  <label className="label" htmlFor="newPassword">New Password</label>
                  <input type="password" id="newPassword" name="newPassword" className="input" required minLength={6} placeholder="••••••••" />
                </div>
                <div>
                  <label className="label" htmlFor="confirmPassword">Confirm Password</label>
                  <input type="password" id="confirmPassword" name="confirmPassword" className="input" required minLength={6} placeholder="••••••••" />
                </div>
                <button type="submit" className="btn" style={{ marginTop: '0.5rem' }}>Change Password</button>
              </form>
            </div>
          )}

          {isAdmin && (
            <div className="card" style={{ marginTop: '2rem' }}>
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Edit Login Credentials</h3>
                <AdminEditProfileForm agent={agent} />
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--danger)', marginBottom: '1rem' }}>Danger Zone</h3>
                <DeleteAgentButton agentId={agent.id} agentName={agent.name} />
              </div>
            </div>
          )}

          {!isShowingPartner && (
            <div style={{ marginTop: '2rem' }}>
              {isAdmin && (
                <div className="card" style={{ marginTop: '2rem' }}>
                  <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Admin: Profile Settings</h2>
                  <AdminEditProfileForm agent={agent} />
                  
                  {isShowingPartner && (
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '2rem' }}>
                      <h3 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>Role Conversion</h3>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Instantly convert this showing partner into an Empire Builder.</p>
                      <form action={convertEmpireAction}>
                        <button type="submit" className="btn" style={{ backgroundColor: 'var(--primary)' }}>
                          Convert to Empire Builder
                        </button>
                      </form>
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '2rem' }}>
                    <h3 style={{ fontSize: '1.25rem', color: 'var(--danger)', marginBottom: '0.5rem' }}>Danger Zone</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Permanently remove this agent and all associated data.</p>
                    <DeleteAgentButton agentId={agent.id} agentName={agent.name} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
