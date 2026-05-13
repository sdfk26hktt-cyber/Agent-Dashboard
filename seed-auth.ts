import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('admin123', 10)
  
  await prisma.agent.upsert({
    where: { email: 'admin@burdstracker.com' },
    update: { password: hash, role: 'ADMIN' },
    create: {
      email: 'admin@burdstracker.com',
      password: hash,
      name: 'Brian Admin',
      role: 'ADMIN',
      startDate: new Date()
    }
  })
  
  console.log('Admin created: admin@burdstracker.com / admin123')
}

main()
