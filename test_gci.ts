import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const gciEntries = await prisma.gciEntry.findMany({ include: { sourceAgent: true } })
  console.log("GCI Entries:", gciEntries)
  
  const agentsWithGrad = await prisma.agent.findMany({ where: { graduatedAt: { not: null } } })
  console.log("Graduated Agents:", agentsWithGrad.map(a => a.name))
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect())
