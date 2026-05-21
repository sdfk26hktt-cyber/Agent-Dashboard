import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  const agent = await prisma.agent.update({
    where: { email: 'brenda@brianburds.com' },
    data: { password: hashedPassword }
  });

  console.log("Reset Brenda's password to: password123");
}

main().finally(() => prisma.$disconnect());
