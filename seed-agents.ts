import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('password123', 10)
  
  const agents = await prisma.agent.findMany({ where: { email: null } })
  
  for (const agent of agents) {
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        email: `${agent.name.toLowerCase().replace(/\s+/g, '.')}@burdstracker.com`,
        password: hash
      }
    })
  }
  console.log(`Updated ${agents.length} agents with default emails and passwords (password123)`)
}

main()
