import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import DailyTrackerForm from '@/app/components/DailyTrackerForm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DailyTrackerPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const agent = await prisma.agent.findUnique({
    where: { id: session.user.id }
  })

  if (!agent) redirect('/login')

  const parts = new Intl.DateTimeFormat('en-US', { 
    timeZone: 'America/Denver',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).formatToParts(new Date());
  
  let currentYear = 0, currentMonthIndex = 0, currentDay = 0;
  for (const part of parts) {
    if (part.type === 'year') currentYear = parseInt(part.value, 10);
    if (part.type === 'month') currentMonthIndex = parseInt(part.value, 10);
    if (part.type === 'day') currentDay = parseInt(part.value, 10);
  }
  
  const targetDateString = searchParams.date || `${currentYear}-${currentMonthIndex.toString().padStart(2, '0')}-${currentDay.toString().padStart(2, '0')}`;
  const [year, month, day] = targetDateString.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const existingTracker = await prisma.dailyTracker.findFirst({
    where: {
      agentId: agent.id,
      date: {
        gte: startOfDay,
        lt: endOfDay
      }
    }
  });

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/" style={{ color: 'var(--accent-primary)', fontSize: '0.875rem' }}>&larr; Back to Dashboard</Link>
      </div>
      <DailyTrackerForm 
        agentId={agent.id} 
        agentName={agent.name} 
        initialData={existingTracker ? {
          dials: existingTracker.dials,
          pointsData: existingTracker.pointsData,
          totalPoints: existingTracker.totalPoints,
          schedule: existingTracker.schedule,
          prospecting: existingTracker.prospecting,
          notes: existingTracker.notes
        } : undefined}
        targetDate={targetDateString} // YYYY-MM-DD
      />
    </div>
  )
}
