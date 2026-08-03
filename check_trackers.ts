import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const tzOffset = -6; // MT offset
  const localNow = new Date(new Date().getTime() + tzOffset * 3600 * 1000);
  const localYesterday = new Date(localNow);
  localYesterday.setDate(localYesterday.getDate() - 1);
  const targetDateString = `${localYesterday.getUTCFullYear()}-${String(localYesterday.getUTCMonth() + 1).padStart(2, '0')}-${String(localYesterday.getUTCDate()).padStart(2, '0')}T00:00:00.000Z`;

  console.log("Checking for ANY trackers on", targetDateString);
  const trackers = await prisma.dailyTracker.findMany({
    where: { date: { equals: new Date(targetDateString) } },
    include: { agent: true }
  });
  
  console.log(`Found ${trackers.length} total trackers for ${targetDateString}.`);
  for (const t of trackers) {
    console.log(`- ${t.agent.name} (Role: ${t.agent.role})`);
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect())
