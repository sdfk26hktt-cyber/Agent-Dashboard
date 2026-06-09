import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const agent = await prisma.agent.findFirst({
    where: { name: { contains: 'Miguel Medina' } },
    include: {
      deals: true,
      gciEntries: true,
      showingPartners: {
        include: { deals: true }
      }
    }
  })
  
  console.log(JSON.stringify(agent, null, 2))
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect())
