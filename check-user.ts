import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const agent = await prisma.agent.findUnique({
    where: { email: 'brenda@brianburds.com' }
  });

  if (!agent) {
    console.log("No agent found with email brenda@brianburds.com");
    return;
  }

  console.log("Agent:", { id: agent.id, name: agent.name, role: agent.role });
  console.log("Current password hash:", agent.password);

  // You can also check if a given string matches the password hash here if needed.
}

main().finally(() => prisma.$disconnect());
