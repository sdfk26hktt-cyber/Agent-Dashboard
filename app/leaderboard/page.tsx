import { prisma } from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from 'next/navigation'
export const dynamic = 'force-dynamic'

export default async function LeaderboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const allAgents = await prisma.agent.findMany({
    include: {
      deals: true,
      dailyTrackers: true,
      gciEntries: {
        include: { sourceAgent: true }
      }
    }
  });

  const showingPartners = allAgents.filter(a => a.role === 'SHOWING_PARTNER' || a.role === 'EMPIRE_BUILDER');
  const teamAgents = allAgents.filter(a => a.role === 'TEAM_AGENT');

  // 1. Top SP by Sold Volume
  const spByVolume = showingPartners.map(sp => {
    const volume = sp.deals.reduce((sum, d) => sum + (d.salesPrice || 0), 0);
    return { ...sp, value: volume };
  }).sort((a, b) => b.value - a.value).slice(0, 10);

  // 2. Top SP by Gross Commission
  const spByGc = showingPartners.map(sp => {
    const gc = sp.deals.reduce((sum, d) => {
      if (!d.salesPrice || !d.commissionPercentage) return sum;
      return sum + (d.salesPrice * (d.commissionPercentage / 100));
    }, 0);
    return { ...sp, value: gc };
  }).sort((a, b) => b.value - a.value).slice(0, 10);

  // 3. Top SP by Closed Units
  const spByUnits = showingPartners.map(sp => {
    return { ...sp, value: sp.deals.length };
  }).sort((a, b) => b.value - a.value).slice(0, 10);

  // 4. Top Overall by 61-point Daily Tracker (Current Month)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const overallByTracker = allAgents.map(a => {
    const trackerPoints = a.dailyTrackers.reduce((sum, t) => {
      const tDate = new Date(t.date);
      if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
        return sum + t.totalPoints;
      }
      return sum;
    }, 0);
    return { ...a, value: trackerPoints };
  }).sort((a, b) => b.value - a.value).slice(0, 10);

  // 5. Top Team Agent by Graduated SP GCI
  const taByGradGci = teamAgents.map(ta => {
    const gradGci = ta.gciEntries.reduce((sum, gci) => {
      // If there is a source agent and they have a graduatedAt date (or they are now an EMPIRE_BUILDER/TEAM_AGENT)
      // Actually, any GciEntry with a sourceAgentId represents GCI coming from an SP they manage. 
      // To strictly match "Graduated SP GCI", we check if the sourceAgent has graduatedAt != null
      if (gci.sourceAgent && gci.sourceAgent.graduatedAt) {
        return sum + gci.amount;
      }
      return sum;
    }, 0);
    return { ...ta, value: gradGci };
  }).sort((a, b) => b.value - a.value).slice(0, 10);


  const LeaderboardCard = ({ title, data, format, icon }: { title: string, data: any[], format: 'currency' | 'number' | 'points', icon: string }) => (
    <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem' }}>
        <span style={{ fontSize: '1.5rem' }}>{icon}</span>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{title}</h2>
      </div>
      
      {data.length === 0 || data[0].value === 0 ? (
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>No data available yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {data.map((item, index) => {
            if (item.value === 0 && index > 0) return null; // Don't show zeroes after 1st place
            
            let formattedValue = '';
            if (format === 'currency') {
              formattedValue = `$${item.value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
            } else if (format === 'points') {
              formattedValue = `${item.value.toFixed(1)} pts`;
            } else {
              formattedValue = item.value.toLocaleString('en-US');
            }

            return (
              <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: index === 0 ? '#f0fdf4' : index === 1 ? '#f8fafc' : index === 2 ? '#fefce8' : 'transparent', borderRadius: '8px', border: index < 3 ? '1px solid #e2e8f0' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', backgroundColor: index === 0 ? '#10b981' : index === 1 ? '#64748b' : index === 2 ? '#eab308' : '#cbd5e1', color: 'white', fontSize: '0.75rem', fontWeight: 800 }}>
                    {index + 1}
                  </div>
                  <strong style={{ color: '#334155', fontSize: '0.9rem' }}>{item.name}</strong>
                </div>
                <span style={{ fontWeight: 700, color: index === 0 ? '#059669' : '#475569', fontSize: '1rem' }}>{formattedValue}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b' }}>🏆 Team Leaderboard</h1>
        <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Gamified rankings showcasing top performers across the organization.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        <LeaderboardCard 
          title="Top Showing Partner by Sold Volume" 
          icon="📈" 
          data={spByVolume} 
          format="currency" 
        />
        <LeaderboardCard 
          title="Top Showing Partner by Gross Commission" 
          icon="💰" 
          data={spByGc} 
          format="currency" 
        />
        <LeaderboardCard 
          title="Top Showing Partner by Closed Units" 
          icon="🔑" 
          data={spByUnits} 
          format="number" 
        />
        <LeaderboardCard 
          title="Top Overall by 61-Point Tracker (This Month)" 
          icon="🎯" 
          data={overallByTracker} 
          format="points" 
        />
        <LeaderboardCard 
          title="Top Team Agent by Graduated SP GCI" 
          icon="🎓" 
          data={taByGradGci} 
          format="currency" 
        />
      </div>
    </div>
  );
}
