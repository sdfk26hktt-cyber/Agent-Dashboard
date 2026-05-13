const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const agents = await prisma.agent.findMany();
    if (agents.length === 0) {
       console.log("No agents");
       return;
    }
    const agent = await prisma.agent.findUnique({
      where: { id: agents[0].id },
      include: {
        supervisor: true,
        deals: { orderBy: { dateClosed: 'desc' } },
        gciEntries: { orderBy: { month: 'desc' } },
        showingPartners: { where: { role: 'TEAM_AGENT' } }
      }
    });
    console.log("Success:", !!agent);
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
