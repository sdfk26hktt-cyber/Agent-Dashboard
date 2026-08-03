export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { addCostEntry, deleteCost } from '@/app/actions'

export default async function CostsLedger() {
  const showingPartnersRaw = await prisma.agent.findMany({
    where: { 
      OR: [
        { role: 'SHOWING_PARTNER' },
        { role: 'EMPIRE_BUILDER' }
      ],
      isActive: true
    },
    include: { supervisor: true }
  })

  const showingPartners = showingPartnersRaw.sort((a, b) => {
    const supA = a.supervisor?.name || 'Zzz'; 
    const supB = b.supervisor?.name || 'Zzz';
    if (supA < supB) return -1;
    if (supA > supB) return 1;
    return a.name.localeCompare(b.name);
  });

  const costEntries = await prisma.costEntry.findMany({
    orderBy: { month: 'desc' },
    include: { showingPartner: { include: { supervisor: true } } }
  })

  const previousMonthDate = new Date();
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
  const defaultMonth = previousMonthDate.toISOString().substring(0, 7);

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1>Cost Ledger</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Track the $30,000/year base salary costs for Showing Partners.</p>
      </div>

      <div className="sidebar-left-grid">
        <div>
          <div className="card">
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Add Monthly Cost</h2>
            <form action={addCostEntry} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="label" htmlFor="month">Month</label>
                <input type="month" id="month" name="month" className="input" required defaultValue={defaultMonth} />
              </div>
              
              <div>
                <label className="label" htmlFor="showingPartnerId">Agent (SP/EB)</label>
                <select id="showingPartnerId" name="showingPartnerId" className="input" required>
                  <option value="">Select an agent</option>
                  {showingPartners.map(sp => (
                    <option key={sp.id} value={sp.id}>{sp.name} (Sup: {sp.supervisor?.name || 'None'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="totalAmount">Total Cost ($)</label>
                <input type="number" id="totalAmount" name="totalAmount" className="input" required defaultValue="2500" step="0.01" />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Usually $2,500/mo ($30k/yr).</p>
              </div>

              <button type="submit" className="btn" style={{ marginTop: '0.5rem' }}>Log Cost</button>
            </form>
          </div>
        </div>

        <div>
          <div className="card">
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Recent Entries</h2>
            
            {costEntries.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No cost entries logged.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Month</th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Partner</th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total</th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Your Share</th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Agent Share</th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {costEntries.map(entry => {
                    const deleteAction = deleteCost.bind(null, entry.id);
                    return (
                      <tr key={entry.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem' }}>
                          {new Date(entry.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <div>{entry.showingPartner.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sup: {entry.showingPartner.supervisor?.name || 'N/A'}</div>
                        </td>
                        <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                          ${entry.totalAmount.toLocaleString()}
                        </td>
                        <td style={{ padding: '0.75rem', color: 'var(--accent-primary)' }}>
                          ${entry.userShare.toLocaleString()}
                        </td>
                        <td style={{ padding: '0.75rem', color: 'var(--success)' }}>
                          ${entry.supervisorShare.toLocaleString()}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <form action={deleteAction}>
                            <button type="submit" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'var(--danger)', backgroundColor: 'transparent' }}>
                              Delete
                            </button>
                          </form>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
