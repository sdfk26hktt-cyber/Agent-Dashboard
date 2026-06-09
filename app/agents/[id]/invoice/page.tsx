export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PrintButton from '@/app/components/PrintButton'

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ month: string }> }) {
  const { id } = await params;
  const { month } = await searchParams;
  
  if (!month) {
    return <div>Month parameter is missing.</div>;
  }

  const agent = await prisma.agent.findUnique({
    where: { id },
  })

  if (!agent) notFound()

  // Parse target month
  const targetDate = new Date(month + '-01T00:00:00.000Z');
  
  // Fetch costs
  const costs = await prisma.costEntry.findMany({
    where: { 
      showingPartner: { supervisorId: id },
      month: targetDate
    },
    include: { showingPartner: true }
  });

  // Fetch GCI
  const gciEntries = await prisma.gciEntry.findMany({
    where: {
      teamAgentId: id,
      month: targetDate
    },
    include: { sourceAgent: true }
  });

  // Fetch Deals for Team Agents
  const targetMonthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
  const deals = await prisma.deal.findMany({
    where: {
      agentId: id,
      dateClosed: {
        gte: targetDate,
        lte: targetMonthEnd
      }
    }
  });

  const supervisorSps = await prisma.agent.findMany({
    where: { supervisorId: id },
    include: {
      deals: {
        where: {
          dateClosed: {
            gte: targetDate,
            lte: targetMonthEnd
          }
        }
      }
    },
    orderBy: { startDate: 'asc' }
  });
  
  const spBonuses: { sp: any, amount: number }[] = [];
  let totalBonusCost = 0;
  
  for (const sp of supervisorSps) {
    const monthGci = sp.deals.reduce((acc: number, d: any) => {
      if (d.salesPrice && d.commissionPercentage) {
        return acc + (d.salesPrice * (d.commissionPercentage / 100));
      }
      return acc;
    }, 0);
    
    if (monthGci >= 28000) {
      spBonuses.push({ sp, amount: 750 });
      totalBonusCost += 750;
    }
  }

  const totalCost = costs.reduce((acc, cost) => acc + cost.supervisorShare, 0);
  const totalGci = gciEntries.reduce((acc, gci) => acc + gci.amount, 0);
  const overrideCredit = totalGci * 0.095;
  const netAmount = totalCost + totalBonusCost - overrideCredit;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', backgroundColor: 'white', color: 'black', borderRadius: '8px' }}>
      <div className="no-print" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between' }}>
        <Link href={`/agents/${agent.id}`} className="btn btn-secondary">&larr; Back to Profile</Link>
        <PrintButton />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>INVOICE</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Invoice for {targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>The Brian Burds Home Selling Team</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>1414 N Oregon<br/>El Paso, TX 79902</p>
        </div>
      </div>

      <div style={{ marginBottom: '3rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bill To</h3>
        <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>{agent.name}</p>
        <p style={{ color: 'var(--text-secondary)' }}>Team Agent</p>
      </div>

      <div className="table-responsive">
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3rem', minWidth: '600px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid black', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem', textTransform: 'uppercase', fontSize: '0.875rem' }}>Description</th>
              <th style={{ padding: '0.75rem', textTransform: 'uppercase', fontSize: '0.875rem', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {spBonuses.map(bonus => (
              <tr key={`bonus-${bonus.sp.id}`} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '1rem 0.75rem' }}>
                  <div style={{ fontWeight: 500 }}>Showing Partner Bonus Share (50/50 split of $1,500)</div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>For: {bonus.sp.name} ($28k+ GCI Achieved)</div>
                </td>
                <td style={{ padding: '1rem 0.75rem', textAlign: 'right', fontWeight: 500 }}>
                  ${bonus.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {costs.map(cost => (
              <tr key={cost.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '1rem 0.75rem' }}>
                  <div style={{ fontWeight: 500 }}>Showing Partner Cost Share</div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>For: {cost.showingPartner.name}</div>
                </td>
                <td style={{ padding: '1rem 0.75rem', textAlign: 'right', fontWeight: 500 }}>
                  ${cost.supervisorShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {gciEntries.map(gci => {
              const credit = gci.amount * 0.095;
              return (
                <tr key={gci.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '1rem 0.75rem' }}>
                    <div style={{ fontWeight: 500 }}>GCI Override Credit (9.5%)</div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      Source: {gci.sourceAgent ? gci.sourceAgent.name : 'Unknown/Legacy Agent'} (Gross: ${gci.amount.toLocaleString()})
                    </div>
                  </td>
                  <td style={{ padding: '1rem 0.75rem', textAlign: 'right', fontWeight: 500, color: '#16a34a' }}>
                    -${credit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
            {deals.map(deal => (
              <tr key={`deal-${deal.id}`} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '1rem 0.75rem' }}>
                  <div style={{ fontWeight: 500 }}>
                    Team Agent Deal Logged
                    {deal.clientName && <span style={{ fontWeight: 'normal', color: 'var(--text-secondary)' }}> - {deal.clientName}</span>}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Property: {deal.address} ({deal.type})
                    {deal.salesPrice && ` | $${deal.salesPrice.toLocaleString()}`}
                    {deal.commissionPercentage && ` (${deal.commissionPercentage}%)`}
                  </div>
                </td>
                <td style={{ padding: '1rem 0.75rem', textAlign: 'right', fontWeight: 500, color: '#6b7280' }}>
                  -
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: '300px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
            <span style={{ color: '#6b7280' }}>Subtotal Costs</span>
            <span style={{ fontWeight: 500 }}>${(totalCost + totalBonusCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '2px solid black' }}>
            <span style={{ color: '#6b7280' }}>Total Credits</span>
            <span style={{ fontWeight: 500, color: '#16a34a' }}>-${overrideCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', fontSize: '1.25rem', fontWeight: 700 }}>
            <span>Net Balance Due</span>
            <span>${netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
