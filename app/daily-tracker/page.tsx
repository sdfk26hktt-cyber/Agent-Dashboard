import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import DailyTrackerForm from '@/app/components/DailyTrackerForm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DailyTrackerPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const agent = await prisma.agent.findUnique({
    where: { id: session.user.id }
  })

  if (!agent) redirect('/login')

  // Find if they already started a tracker today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existingTracker = await prisma.dailyTracker.findFirst({
    where: {
      agentId: agent.id,
      date: {
        gte: today,
        lt: tomorrow
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
      />
    </div>
  )
}
