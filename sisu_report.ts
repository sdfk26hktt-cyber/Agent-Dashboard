import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const trackers = await prisma.dailyTracker.findMany({
    where: {
      date: {
        gte: new Date("2026-06-27T00:00:00.000Z")
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
    },
    orderBy: {
      date: 'asc'
    }
  });

  const report: Record<string, any> = {};

  for (const tracker of trackers) {
    if (!tracker.agent.supervisor || !tracker.agent.supervisor.sisuId) continue;
    
    const sisuId = tracker.agent.supervisor.sisuId;
    const supervisorName = tracker.agent.supervisor.name;
    const dateStr = tracker.date.toISOString().substring(0, 10);
    const key = `${dateStr}_${sisuId}`;

    let callsCount = 0;
    if (tracker.pointsData) {
      const pd = tracker.pointsData as any;
      if (pd && pd.calls) {
        callsCount = parseInt(pd.calls.value || 0, 10);
      }
    }
    const dialsCount = tracker.dials || 0;

    if (dialsCount === 0 && callsCount === 0) continue;

    if (!report[key]) {
      report[key] = {
        date: dateStr,
        supervisor: supervisorName,
        sisuId: sisuId,
        dials: 0,
        calls: 0,
        showingPartners: new Set()
      };
    }
    
    report[key].dials += dialsCount;
    report[key].calls += callsCount;
    report[key].showingPartners.add(tracker.agent.name);
  }

  console.log("--- SISU SYNC REPORT (Since June 27) ---");
  const entries = Object.values(report);
  if (entries.length === 0) {
    console.log("No valid activities found to sync since June 27.");
  } else {
    for (const entry of entries) {
      const sps = Array.from(entry.showingPartners).join(", ");
      console.log(`\nDate: ${entry.date}`);
      console.log(`Team Agent: ${entry.supervisor} (Sisu ID: ${entry.sisuId})`);
      console.log(`Contributing SPs: ${sps}`);
      console.log(`Payload Sent -> DIALS: ${entry.dials} | CONTA (Calls): ${entry.calls}`);
    }
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect())
