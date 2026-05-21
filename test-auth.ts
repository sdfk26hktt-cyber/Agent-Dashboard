import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function test() {
  const email = 'testuser123@example.com';
  
  // 1. Create User
  const hashedPassword1 = await bcrypt.hash('initialpassword', 10);
  let agent = await prisma.agent.create({
    data: {
      name: 'Test User',
      email: email,
      password: hashedPassword1,
      role: 'SHOWING_PARTNER',
      startDate: new Date()
    }
  });
  console.log("Created user with initialpassword");

  // 2. User changes own password
  const hashedPassword2 = await bcrypt.hash('userchanged', 10);
  await prisma.agent.update({
    where: { id: agent.id },
    data: { password: hashedPassword2 }
  });
  console.log("User changed own password to userchanged");

  // Verify 'userchanged'
  agent = await prisma.agent.findUnique({ where: { id: agent.id } }) as any;
  let isValid = await bcrypt.compare('userchanged', agent.password!);
  console.log("Is 'userchanged' valid?", isValid);

  // 3. Admin changes password via editAgentProfile
  const adminNewPassword = 'adminchanged';
  const hashedPassword3 = await bcrypt.hash(adminNewPassword.trim(), 10);
  await prisma.agent.update({
    where: { id: agent.id },
    data: { password: hashedPassword3 }
  });
  console.log("Admin changed password to adminchanged");

  // Verify 'adminchanged'
  agent = await prisma.agent.findUnique({ where: { id: agent.id } }) as any;
  isValid = await bcrypt.compare('adminchanged', agent.password!);
  console.log("Is 'adminchanged' valid?", isValid);
  
  isValid = await bcrypt.compare('userchanged', agent.password!);
  console.log("Is 'userchanged' still valid? (should be false)", isValid);

  // Cleanup
  await prisma.agent.delete({ where: { id: agent.id } });
}

test().catch(console.error).finally(() => prisma.$disconnect());
