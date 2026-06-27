import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    // Determine the date for "yesterday" in Mountain Time
    const tzOffset = -6; // MT offset
    const localNow = new Date(new Date().getTime() + tzOffset * 3600 * 1000);
    const localYesterday = new Date(localNow);
    localYesterday.setDate(localYesterday.getDate() - 1);
    
    // Create the exact Midnight UTC string that matches how DailyTracker date is saved
    const targetDateString = `${localYesterday.getUTCFullYear()}-${String(localYesterday.getUTCMonth() + 1).padStart(2, '0')}-${String(localYesterday.getUTCDate()).padStart(2, '0')}T00:00:00.000Z`;

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

    // Aggregate by Supervisor's Sisu ID since multiple SPs might fall under one TA
    const supervisorAggregates: Record<number, { dials: number, calls: number }> = {};

    for (const tracker of trackers) {
      if (!tracker.agent.supervisor || !tracker.agent.supervisor.sisuId) continue;
      
      const sisuId = tracker.agent.supervisor.sisuId;

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

    let successCount = 0;

    for (const [sisuIdStr, aggregates] of Object.entries(supervisorAggregates)) {
      const sisuId = parseInt(sisuIdStr, 10);
      if (aggregates.dials === 0 && aggregates.calls === 0) continue;

      const payload = {
        increment_all_activities: true,
        activities: [
          {
            increment: true,
            date: targetDateString.substring(0, 10),
            activity_type: "DIALS",
            count: aggregates.dials
          },
          {
            increment: true,
            date: targetDateString.substring(0, 10),
            activity_type: "CONTA",
            count: aggregates.calls
          }
        ]
      };

      const res = await fetch(`https://api.sisu.co/api/v1/agent/activity/${sisuId}/1`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Basic YnJpYW4tYnVyZHMtaG9tZS1zZWxsaW5nLXRlYW06MGVmMzI5MDEtYzZhMC00MTY3LTgwZTItYThmMjA5Mzc0NTc1',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        console.error(`Failed to sync for Sisu ID ${sisuId}: ${res.statusText}`);
      } else {
        successCount++;
      }
    }

    return NextResponse.json({ success: true, count: successCount, targetDate: targetDateString });
  } catch (error: any) {
    console.error("Sisu Sync Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
