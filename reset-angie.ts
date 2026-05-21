import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const agent = await prisma.agent.findFirst({
    where: { name: { contains: 'Angie', mode: 'insensitive' } }
  });

  if (!agent) {
    console.log("No agent found matching Angie");
    return;
  }

  const hashedPassword = await bcrypt.hash('password123', 10);
  await prisma.agent.update({
    where: { id: agent.id },
    data: { password: hashedPassword }
  });

  console.log(`Reset ${agent.name} (${agent.email})'s password to: password123`);
}

main().finally(() => prisma.$disconnect());
