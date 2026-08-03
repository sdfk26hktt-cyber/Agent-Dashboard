import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const tzOffset = -6; // MT offset
  const localNow = new Date(new Date().getTime() + tzOffset * 3600 * 1000);
  const localYesterday = new Date(localNow);
  localYesterday.setDate(localYesterday.getDate() - 1);
  
  // This targets yesterday (June 27) which would have been processed this morning at 12:01 AM MT
  const targetDateString = `${localYesterday.getUTCFullYear()}-${String(localYesterday.getUTCMonth() + 1).padStart(2, '0')}-${String(localYesterday.getUTCDate()).padStart(2, '0')}T00:00:00.000Z`;
  console.log("Target Date:", targetDateString);

  const trackers = await prisma.dailyTracker.findMany({
    where: {
      date: {
        equals: new Date(targetDateString)
      },
      agent: {
        role: 'SHOWING_PARTNER',
        supervisor: {
          sisuId: { not: null }
        }
      }
    },
    include: { 
      agent: {
        include: {
          supervisor: true
        }
      }
    }
  });

  console.log(`Found ${trackers.length} trackers for Showing Partners whose supervisors have Sisu IDs.`);

  const supervisorAggregates: Record<number, { dials: number, calls: number }> = {};
  const supervisorNames: Record<number, string> = {};

  for (const tracker of trackers) {
    if (!tracker.agent.supervisor || !tracker.agent.supervisor.sisuId) continue;
    
    const sisuId = tracker.agent.supervisor.sisuId;
    supervisorNames[sisuId] = tracker.agent.supervisor.name;

    let callsCount = 0;
    if (tracker.pointsData) {
      const pd = tracker.pointsData as any;
      if (pd && pd.calls) {
        callsCount = parseInt(pd.calls.value || 0, 10);
      }
    }
    const dialsCount = tracker.dials || 0;

    if (!supervisorAggregates[sisuId]) {
      supervisorAggregates[sisuId] = { dials: 0, calls: 0 };
    }
    
    supervisorAggregates[sisuId].dials += dialsCount;
    supervisorAggregates[sisuId].calls += callsCount;
  }

  for (const [sisuIdStr, aggregates] of Object.entries(supervisorAggregates)) {
    const sisuId = parseInt(sisuIdStr, 10);
    console.log(`Supervisor: ${supervisorNames[sisuId]} (Sisu ID: ${sisuId}) => Dials: ${aggregates.dials}, Conversations (Calls): ${aggregates.calls}`);
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect())
