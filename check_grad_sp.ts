import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const allAgents = await prisma.agent.findMany({
    where: { role: 'TEAM_AGENT' },
    include: {
      showingPartners: {
        include: { deals: true }
      }
    }
  })
  
  for (const ta of allAgents) {
    const graduatedSPs = ta.showingPartners.filter(sp => sp.graduatedAt !== null)
    if (graduatedSPs.length > 0) {
      console.log(`Team Agent: ${ta.name}`)
      for (const sp of graduatedSPs) {
        console.log(`  Graduated SP: ${sp.name}`)
        console.log(`    Deals count: ${sp.deals.length}`)
        const gci = sp.deals.reduce((sum, d) => sum + ((d.salesPrice || 0) * ((d.commissionPercentage || 0) / 100)), 0)
        console.log(`    Total GCI ever: ${gci}`)
        
        // Let's also print dates for deals to see if they fall in the current or last month
        for (const d of sp.deals) {
           console.log(`      Deal: ${d.address} closed on ${d.dateClosed} for $${d.salesPrice} at ${d.commissionPercentage}%`)
        }
      }
    }
  }
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect())
