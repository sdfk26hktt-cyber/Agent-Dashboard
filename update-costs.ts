import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const costs = await prisma.costEntry.findMany();
  let updated = 0;
  
  for (const cost of costs) {
    const userShare = cost.totalAmount * 0.50;
    const supervisorShare = cost.totalAmount * 0.50;
    
    await prisma.costEntry.update({
      where: { id: cost.id },
      data: { userShare, supervisorShare }
    });
    updated++;
  }
  
  console.log(`Updated ${updated} cost entries to 50/50 split.`);
}

main().finally(() => prisma.$disconnect());
