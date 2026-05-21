import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function test() {
  const agent = await prisma.agent.findFirst({ where: { email: 'brenda@brianburds.com' }});
  const isValid = await bcrypt.compare('adminchangedthis123', agent!.password!);
  console.log("Did the password update succeed before the crash?", isValid);
}

test().catch(console.error).finally(() => prisma.$disconnect());
