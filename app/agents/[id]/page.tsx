export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { addDeal, graduateAgent, toggleFirstSpOverride } from '@/app/actions'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import DeleteAgentButton from '@/app/components/DeleteAgentButton'
import AdminDealActions from '@/app/components/AdminDealActions'
import AdminEditProfileForm from '@/app/components/AdminEditProfileForm'
import PointsBreakdownChart from '@/app/components/charts/PointsBreakdownChart'
import GciHistoryChart from '@/app/components/charts/GciHistoryChart'
import SalesVolumeChart from '@/app/components/charts/SalesVolumeChart'
import ProspectTracker from '@/app/components/ProspectTracker'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export default async function AgentProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'ADMIN' && session.user.id !== id) redirect('/')
  const isAdmin = session.user.role === 'ADMIN'

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
      }
    }
  })

  if (!agent) notFound()

  const isShowingPartner = agent.role === 'SHOWING_PARTNER'
  const isEmpireBuilder = agent.role === 'EMPIRE_BUILDER'
  const isBonusEligible = isShowingPartner || isEmpireBuilder
  
  let isFirstSp = false;
  if (isShowingPartner && agent.supervisorId) {
    const supervisorSps = await prisma.agent.findMany({
      where: { supervisorId: agent.supervisorId },
      orderBy: { startDate: 'asc' }
    });
    const overriddenSp = supervisorSps.find(sp => sp.isFirstSpOverride);
    if (overriddenSp) {
      isFirstSp = overriddenSp.id === agent.id;
    } else if (supervisorSps.length > 0) {
      isFirstSp = supervisorSps[0].id === agent.id;
    }
  }

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

      // Credit back for first 3 months of 1st SP
      const sp = cost.showingPartner;
      let isFirstSp = false;
      if (!agent.disableFirstSpCredit) {
        const supervisorSps = await prisma.agent.findMany({
          where: { supervisorId: id },
          orderBy: { startDate: 'asc' }
        });
        const overriddenSp = supervisorSps.find(s => s.isFirstSpOverride);
        if (overriddenSp) {
          isFirstSp = overriddenSp.id === sp.id;
        } else if (supervisorSps.length > 0) {
          isFirstSp = supervisorSps[0].id === sp.id;
        }
      }

      if (isFirstSp) {
        const monthsDiff = (cost.month.getTime() - new Date(sp.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (monthsDiff < 3 && monthsDiff >= 0) {
          entry.overrideCredit += cost.supervisorShare;
          entry.netAmount -= cost.supervisorShare;
        }
      }
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
  const currentMonthStart = new Date();
  currentMonthStart.setDate(1);
  currentMonthStart.setHours(0, 0, 0, 0);
  
  let currentMonthGci = 0;
  if (isBonusEligible) {
    const currentMonthDeals = agent.deals.filter(d => new Date(d.dateClosed) >= currentMonthStart);
    currentMonthGci = currentMonthDeals.reduce((acc, d) => {
      if (d.salesPrice && d.commissionPercentage) {
        return acc + (d.salesPrice * (d.commissionPercentage / 100));
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
  const overrideAction = toggleFirstSpOverride.bind(null, agent.id);

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/" style={{ color: 'var(--accent-primary)', fontSize: '0.875rem' }}>&larr; Back to Dashboard</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '1rem' }}>
          <div>
            <h1 style={{ marginBottom: '0.5rem' }}>{agent.name}</h1>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span className={`badge ${agent.role === 'TEAM_AGENT' ? 'badge-green' : agent.role === 'EMPIRE_BUILDER' ? 'badge-slate' : 'badge-blue'}`}>
                {agent.role === 'TEAM_AGENT' ? 'Team Agent' : agent.role === 'EMPIRE_BUILDER' ? 'Empire Builder' : 'Showing Partner'}
              </span>
              {isFirstSp && (
                <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#d97706' }}>
                  1st SP (Cost Offset)
                </span>
              )}
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
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

                        return (
                          <div key={sp.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Link href={`/agents/${sp.id}`} style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)' }}>
                                {sp.name}
                              </Link>
                              <span style={{ fontSize: '0.875rem', color: totalPts >= 25 ? 'var(--success)' : 'var(--text-secondary)', fontWeight: totalPts >= 25 ? 600 : 400 }}>
                                {totalPts.toFixed(1)} / 25 pts
                              </span>
                            </div>
                            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${progress}%`, height: '100%', backgroundColor: totalPts >= 25 ? 'var(--success)' : 'var(--primary)' }} />
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
                      <th style={{ padding: '0.5rem' }}>Override Credit</th>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="label" htmlFor="salesPrice">Sales Price ($)</label>
                    <input type="number" id="salesPrice" name="salesPrice" className="input" step="0.01" placeholder="250000" />
                  </div>
                  <div>
                    <label className="label" htmlFor="commissionPercentage">Commission (%)</label>
                    <input type="number" id="commissionPercentage" name="commissionPercentage" className="input" step="0.01" placeholder="3.0" />
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

          {isAdmin && isShowingPartner && (
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
                  
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '2rem' }}>
                    <h3 style={{ fontSize: '1.25rem', color: 'var(--danger)', marginBottom: '0.5rem' }}>Danger Zone</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Permanently remove this Team Agent and all associated data.</p>
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
