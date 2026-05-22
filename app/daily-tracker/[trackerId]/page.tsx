import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import DailyTrackerForm from '@/app/components/DailyTrackerForm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ViewTrackerPage({ params }: { params: Promise<{ trackerId: string }> }) {
  const { trackerId } = await params;

  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const tracker = await prisma.dailyTracker.findUnique({
    where: { id: trackerId },
    include: { agent: true }
  })

  if (!tracker) notFound()

  // Verify permissions
  const isAdmin = session.user.role === 'ADMIN'
  const isOwner = session.user.id === tracker.agentId
  let isSupervisor = false

  if (!isAdmin && !isOwner) {
    if (session.user.role === 'TEAM_AGENT') {
      isSupervisor = tracker.agent.supervisorId === session.user.id
    } else if (session.user.role === 'EMPIRE_BUILDER') {
      const loggedInAgent = await prisma.agent.findUnique({ where: { id: session.user.id } })
      isSupervisor = tracker.agent.supervisorId === loggedInAgent?.supervisorId
    }

    if (!isSupervisor) {
      redirect('/')
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href={`/agents/${tracker.agentId}`} style={{ color: 'var(--accent-primary)', fontSize: '0.875rem' }}>&larr; Back to Profile</Link>
      </div>
      <DailyTrackerForm 
        agentId={tracker.agent.id} 
        agentName={tracker.agent.name} 
        readOnly={true}
        initialData={{
          date: tracker.date,
          dials: tracker.dials,
          pointsData: tracker.pointsData,
          totalPoints: tracker.totalPoints,
          schedule: tracker.schedule,
          prospecting: tracker.prospecting,
          notes: tracker.notes
        }}
      />
    </div>
  )
}
