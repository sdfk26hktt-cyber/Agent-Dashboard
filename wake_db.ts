import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  for (let i = 0; i < 5; i++) {
    try {
      console.log(`Attempt ${i+1} to connect to DB...`);
      await prisma.$queryRaw`SELECT 1`;
      console.log("Connected successfully!");
      return;
    } catch (e: any) {
      console.log("Failed:", e.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}
main().finally(() => prisma.$disconnect())
