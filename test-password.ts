import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
import bcrypt from 'bcryptjs'

async function test() {
  const agentId = 'test-id'; // wait, I don't know an ID. I will fetch one.
  const agent = await prisma.agent.findFirst({
    where: { role: 'SHOWING_PARTNER' }
  });

  if (!agent) {
    console.log("No agent found");
    return;
  }

  console.log("Original agent password hash:", agent.password);

  const password = "newpassword123";
  let dataToUpdate: any = {};
  if (password) {
    dataToUpdate.password = await bcrypt.hash(password, 10)
  }

  console.log("New password hash:", dataToUpdate.password);

  await prisma.agent.update({
    where: { id: agent.id },
    data: dataToUpdate
  });

  const updatedAgent = await prisma.agent.findUnique({ where: { id: agent.id }});
  console.log("Updated agent password hash:", updatedAgent?.password);

  const isMatch = await bcrypt.compare(password, updatedAgent?.password || '');
  console.log("Does it match?", isMatch);

  // revert password
  if (agent.password) {
    await prisma.agent.update({
      where: { id: agent.id },
      data: { password: agent.password }
    });
  }
}

test().catch(console.error).finally(() => prisma.$disconnect());
