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

  const parts = new Intl.DateTimeFormat('en-US', { 
    timeZone: 'America/Denver',
    year: 'numeric',
    month: 'numeric'
  }).formatToParts(new Date());
  
  let currentYear = 0, currentMonthIndex = 0;
  for (const part of parts) {
    if (part.type === 'year') currentYear = parseInt(part.value, 10);
    if (part.type === 'month') currentMonthIndex = parseInt(part.value, 10);
  }
  const currentMonth = currentMonthIndex - 1;

  const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const lastMonth = lastMonthDate.getMonth();
  const lastYear = lastMonthDate.getFullYear();

  const isCurrentMonth = (date: Date) => date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  const isLastMonth = (date: Date) => date.getMonth() === lastMonth && date.getFullYear() === lastYear;

  // 1. Top SP by Sold Volume
  const getVolume = (sp: any, filterFn: (d: Date) => boolean) => sp.deals.filter((d: any) => filterFn(new Date(d.dateClosed))).reduce((sum: number, d: any) => sum + (d.salesPrice || 0), 0);
  const spByVolumeCurrent = showingPartners.map(sp => ({ ...sp, value: getVolume(sp, isCurrentMonth) })).sort((a, b) => b.value - a.value).slice(0, 10);
  const spByVolumeLast = showingPartners.map(sp => ({ ...sp, value: getVolume(sp, isLastMonth) })).sort((a, b) => b.value - a.value).slice(0, 10);

  // 2. Top SP by Gross Commission
  const getGc = (sp: any, filterFn: (d: Date) => boolean) => sp.deals.filter((d: any) => filterFn(new Date(d.dateClosed))).reduce((sum: number, d: any) => {
    if (!d.salesPrice || !d.commissionPercentage) return sum;
    return sum + (d.salesPrice * (d.commissionPercentage / 100));
  }, 0);
  const spByGcCurrent = showingPartners.map(sp => ({ ...sp, value: getGc(sp, isCurrentMonth) })).sort((a, b) => b.value - a.value).slice(0, 10);
  const spByGcLast = showingPartners.map(sp => ({ ...sp, value: getGc(sp, isLastMonth) })).sort((a, b) => b.value - a.value).slice(0, 10);

  // 3. Top SP by Closed Units
  const getUnits = (sp: any, filterFn: (d: Date) => boolean) => sp.deals.filter((d: any) => filterFn(new Date(d.dateClosed))).length;
  const spByUnitsCurrent = showingPartners.map(sp => ({ ...sp, value: getUnits(sp, isCurrentMonth) })).sort((a, b) => b.value - a.value).slice(0, 10);
  const spByUnitsLast = showingPartners.map(sp => ({ ...sp, value: getUnits(sp, isLastMonth) })).sort((a, b) => b.value - a.value).slice(0, 10);

  // 4. Top Overall by 61-point Daily Tracker
  const getTrackerPoints = (agent: any, filterFn: (d: Date) => boolean) => agent.dailyTrackers.filter((t: any) => filterFn(new Date(t.date))).reduce((sum: number, t: any) => sum + t.totalPoints, 0);
  const overallByTrackerCurrent = allAgents.map(a => ({ ...a, value: getTrackerPoints(a, isCurrentMonth) })).sort((a, b) => b.value - a.value).slice(0, 10);
  const overallByTrackerLast = allAgents.map(a => ({ ...a, value: getTrackerPoints(a, isLastMonth) })).sort((a, b) => b.value - a.value).slice(0, 10);

  // 5. Top Team Agent by Graduated SP GCI
  const getGradGci = (ta: any, filterFn: (d: Date) => boolean) => ta.gciEntries.filter((gci: any) => filterFn(new Date(gci.month))).reduce((sum: number, gci: any) => {
    if (gci.sourceAgent && gci.sourceAgent.graduatedAt) {
      return sum + gci.amount;
    }
    return sum;
  }, 0);
  const taByGradGciCurrent = teamAgents.map(ta => ({ ...ta, value: getGradGci(ta, isCurrentMonth) })).sort((a, b) => b.value - a.value).slice(0, 10);
  const taByGradGciLast = teamAgents.map(ta => ({ ...ta, value: getGradGci(ta, isLastMonth) })).sort((a, b) => b.value - a.value).slice(0, 10);


  const LeaderboardList = ({ data, format, title }: { data: any[], format: 'currency' | 'number' | 'points', title: string }) => (
    <div style={{ flex: 1, minWidth: '250px' }}>
      <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>{title}</h3>
      {data.length === 0 || data[0].value === 0 ? (
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0' }}>No data.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {data.map((item, index) => {
            if (item.value === 0 && index > 0) return null; 
            
            let formattedValue = '';
            if (format === 'currency') {
              formattedValue = `$${item.value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
            } else if (format === 'points') {
              formattedValue = `${item.value.toFixed(1)} pts`;
            } else {
              formattedValue = item.value.toLocaleString('en-US');
            }

            return (
              <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', backgroundColor: index === 0 ? '#f0fdf4' : index === 1 ? '#f8fafc' : index === 2 ? '#fefce8' : 'transparent', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', backgroundColor: index === 0 ? '#10b981' : index === 1 ? '#64748b' : index === 2 ? '#eab308' : '#cbd5e1', color: 'white', fontSize: '0.65rem', fontWeight: 800 }}>
                    {index + 1}
                  </div>
                  <strong style={{ color: '#334155', fontSize: '0.85rem' }}>{item.name}</strong>
                </div>
                <span style={{ fontWeight: 700, color: index === 0 ? '#059669' : '#475569', fontSize: '0.875rem' }}>{formattedValue}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  const LeaderboardCategory = ({ title, icon, currentData, lastData, format }: { title: string, icon: string, currentData: any[], lastData: any[], format: 'currency' | 'number' | 'points' }) => (
    <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '1.5rem' }}>{icon}</span>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>{title}</h2>
      </div>
      
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <LeaderboardList title="Current Month" data={currentData} format={format} />
        <LeaderboardList title="Last Month" data={lastData} format={format} />
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b' }}>🏆 Team Leaderboard</h1>
        <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Monthly gamified rankings showcasing top performers across the organization.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <LeaderboardCategory 
          title="Top Showing Partner by Sold Volume" 
          icon="📈" 
          currentData={spByVolumeCurrent} 
          lastData={spByVolumeLast} 
          format="currency" 
        />
        <LeaderboardCategory 
          title="Top Showing Partner by Gross Commission" 
          icon="💰" 
          currentData={spByGcCurrent} 
          lastData={spByGcLast} 
          format="currency" 
        />
        <LeaderboardCategory 
          title="Top Showing Partner by Closed Units" 
          icon="🔑" 
          currentData={spByUnitsCurrent} 
          lastData={spByUnitsLast} 
          format="number" 
        />
        <LeaderboardCategory 
          title="Top Overall by 61-Point Tracker" 
          icon="🎯" 
          currentData={overallByTrackerCurrent} 
          lastData={overallByTrackerLast} 
          format="points" 
        />
        <LeaderboardCategory 
          title="Top Team Agent by Graduated SP GCI" 
          icon="🎓" 
          currentData={taByGradGciCurrent} 
          lastData={taByGradGciLast} 
          format="currency" 
        />
      </div>
    </div>
  );
}
