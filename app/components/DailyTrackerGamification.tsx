'use client'

interface GamificationProps {
  dailyPoints: number;
  weeklyPoints: number;
  monthlyPoints: number;
  monthlyTarget: number;
}

const CircleProgress = ({ percentage, text, subtext, color }: { percentage: number, text: string, subtext: string, color: string }) => {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} stroke="var(--border-color)" strokeWidth="10" fill="none" />
        <circle 
          cx="60" cy="60" 
          r={radius} 
          stroke={color} 
          strokeWidth="10" 
          fill="none" 
          strokeDasharray={circumference} 
          strokeDashoffset={strokeDashoffset} 
          strokeLinecap="round" 
          transform="rotate(-90 60 60)" 
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div style={{ marginTop: '-85px', textAlign: 'center', height: '85px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{text}</span>
      </div>
      <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '150px' }}>{subtext}</div>
    </div>
  );
};

export default function DailyTrackerGamification({ dailyPoints, weeklyPoints, monthlyPoints, monthlyTarget }: GamificationProps) {
  const dailyTarget = 61;
  const weeklyTarget = 305; // 5 days * 61 points

  const dailyPercentage = Math.min(100, (dailyPoints / dailyTarget) * 100);
  const weeklyPercentage = Math.min(100, (weeklyPoints / weeklyTarget) * 100);
  const monthlyPercentage = Math.min(100, (monthlyPoints / monthlyTarget) * 100);

  return (
    <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Rhythm Tracker</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Track your 61 points of rhythm</p>
      </div>
      <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <CircleProgress 
          percentage={dailyPercentage} 
          text={`${Math.round(dailyPoints)} / ${dailyTarget}`} 
          subtext="Daily Goal" 
          color={dailyPercentage >= 100 ? "#10b981" : "#3b82f6"} 
        />
        <CircleProgress 
          percentage={weeklyPercentage} 
          text={`${Math.round(weeklyPoints)} / ${weeklyTarget}`} 
          subtext="Weekly Goal" 
          color={weeklyPercentage >= 100 ? "#10b981" : "#f59e0b"} 
        />
        <CircleProgress 
          percentage={monthlyPercentage} 
          text={`${Math.round(monthlyPoints)} / ${monthlyTarget}`} 
          subtext="Monthly Goal" 
          color={monthlyPercentage >= 100 ? "#10b981" : "#8b5cf6"} 
        />
      </div>
    </div>
  )
}
