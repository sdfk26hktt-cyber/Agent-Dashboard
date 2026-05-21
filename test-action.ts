import { editAgentProfile } from './app/actions'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function test() {
  const agent = await prisma.agent.findFirst({ where: { email: 'brenda@brianburds.com' }});
  if (!agent) return;

  const newPassword = 'adminchangedthis123';
  await editAgentProfile(agent.id, agent.name, agent.email!, newPassword, agent.startDate.toISOString().substring(0, 10));

  const updated = await prisma.agent.findUnique({ where: { id: agent.id }});
  const isValid = await bcrypt.compare(newPassword, updated!.password!);
  console.log("Did editAgentProfile correctly hash and save the new password?", isValid);
}

test().catch(console.error).finally(() => prisma.$disconnect());
