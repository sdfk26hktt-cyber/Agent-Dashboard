'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

import bcrypt from 'bcryptjs'

export async function createAgent(data: FormData) {
  const name = data.get('name') as string
  const role = data.get('role') as string
  const startDate = data.get('startDate') as string
  const supervisorId = data.get('supervisorId') as string | null
  const email = (data.get('email') as string).toLowerCase().trim()
  const password = data.get('password') as string

  const hashedPassword = await bcrypt.hash(password, 10)

  await prisma.agent.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
      startDate: new Date(startDate),
      supervisorId: supervisorId || null
    }
  })

  revalidatePath('/')
  revalidatePath('/agents')
}

export async function addDeal(agentId: string, data: FormData) {
  const address = data.get('address') as string
  const type = data.get('type') as string
  const dateClosed = data.get('dateClosed') as string
  const clientName = data.get('clientName') as string | null
  const salesPrice = data.get('salesPrice') ? parseFloat(data.get('salesPrice') as string) : null
  const commissionPercentage = data.get('commissionPercentage') ? parseFloat(data.get('commissionPercentage') as string) : null
  const referralPercentage = data.get('referralPercentage') ? parseFloat(data.get('referralPercentage') as string) : 0

  await prisma.deal.create({
    data: {
      address,
      type,
      dateClosed: new Date(dateClosed),
      clientName,
      salesPrice,
      commissionPercentage,
      referralPercentage,
      agentId,
    }
  })

  revalidatePath(`/agents/${agentId}`)
  revalidatePath('/')
}

export async function graduateAgent(agentId: string) {
  await prisma.agent.update({
    where: { id: agentId },
    data: {
      role: 'TEAM_AGENT',
      graduatedAt: new Date(),
    }
  })

  revalidatePath(`/agents/${agentId}`)
  revalidatePath('/')
}

export async function convertToEmpireBuilder(agentId: string) {
  await prisma.agent.update({
    where: { id: agentId },
    data: {
      role: 'EMPIRE_BUILDER',
      graduatedAt: new Date(),
    }
  })

  revalidatePath(`/agents/${agentId}`)
  revalidatePath('/')
}

export async function addCostEntry(data: FormData) {
  const month = data.get('month') as string
  const totalAmount = parseFloat(data.get('totalAmount') as string)
  const showingPartnerId = data.get('showingPartnerId') as string

  const sp = await prisma.agent.findUnique({
    where: { id: showingPartnerId },
    include: { supervisor: true }
  })

  if (!sp || !sp.supervisorId) throw new Error('Showing Partner must have a supervisor')

  const spStartDate = new Date(sp.startDate)
  const costMonth = new Date(month)

  let userShare = totalAmount * 0.60
  let supervisorShare = totalAmount * 0.40

  await prisma.costEntry.create({
    data: {
      month: costMonth,
      totalAmount,
      userShare,
      supervisorShare,
      showingPartnerId
    }
  })

  revalidatePath('/costs')
}

export async function deleteCost(costId: string) {
  await prisma.costEntry.delete({ where: { id: costId } })
  revalidatePath('/costs')
  revalidatePath('/agents/[id]', 'page')
}

export async function addGciEntry(teamAgentId: string, data: FormData) {
  const month = data.get('month') as string
  const amount = parseFloat(data.get('amount') as string)
  const sourceAgentId = data.get('sourceAgentId') as string | null

  await prisma.gciEntry.create({
    data: {
      month: new Date(month + '-01T00:00:00.000Z'),
      amount,
      teamAgentId,
      sourceAgentId: sourceAgentId || null
    }
  })

  revalidatePath(`/agents/${teamAgentId}`)
  revalidatePath('/')
}



export async function deleteAgent(agentId: string) {
  // Thanks to cascade deletion in the schema, 
  // deleting the agent will automatically delete their deals, gciEntries, and costEntries.
  await prisma.agent.delete({
    where: { id: agentId }
  })

  revalidatePath('/')
  revalidatePath('/agents')
  revalidatePath('/costs')
}

export async function updateDeal(dealId: string, address: string, type: string, dateClosed: string, referralPercentage: number = 0, clientName: string | null = null, salesPrice: number | null = null, commissionPercentage: number | null = null) {
  await prisma.deal.update({
    where: { id: dealId },
    data: { address, type, dateClosed: new Date(dateClosed), referralPercentage, clientName, salesPrice, commissionPercentage }
  })
  revalidatePath('/agents/[id]', 'page')
}

export async function deleteDeal(dealId: string) {
  await prisma.deal.delete({ where: { id: dealId } })
  revalidatePath('/agents/[id]', 'page')
}

export async function updateGci(gciId: string, amount: number, month: string) {
  await prisma.gciEntry.update({
    where: { id: gciId },
    data: { amount, month: new Date(month + '-01T00:00:00.000Z') }
  })
  revalidatePath('/agents/[id]', 'page')
}

export async function deleteGci(gciId: string) {
  await prisma.gciEntry.delete({ where: { id: gciId } })
  revalidatePath('/agents/[id]', 'page')
}

export async function editAgentProfile(agentId: string, name: string, email: string, password?: string, isFirstSpOverride?: boolean, startDateStr?: string, disableFirstSpCredit?: boolean) {
  const dataToUpdate: any = { name, email: email.toLowerCase().trim() }
  
  if (password) {
    dataToUpdate.password = await bcrypt.hash(password, 10)
  }

  if (startDateStr) {
    dataToUpdate.startDate = new Date(startDateStr + 'T00:00:00.000Z')
  }

  if (disableFirstSpCredit !== undefined) {
    dataToUpdate.disableFirstSpCredit = disableFirstSpCredit;
  }

  await prisma.agent.update({
    where: { id: agentId },
    data: dataToUpdate
  })

  revalidatePath(`/agents/${agentId}`)
  revalidatePath('/agents')
}

export async function updatePassword(agentId: string, data: FormData) {
  const newPassword = data.get('newPassword') as string
  const confirmPassword = data.get('confirmPassword') as string

  if (!newPassword || newPassword !== confirmPassword) {
    throw new Error('Passwords do not match')
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10)

  await prisma.agent.update({
    where: { id: agentId },
    data: { password: hashedPassword }
  })

  revalidatePath(`/agents/${agentId}`)
}

export async function saveDailyTracker(agentId: string, data: any) {
  // Try to find if there's already a tracker for today for this agent
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existingTracker = await prisma.dailyTracker.findFirst({
    where: {
      agentId,
      date: {
        gte: today,
        lt: tomorrow
      }
    }
  });

  if (existingTracker) {
    await prisma.dailyTracker.update({
      where: { id: existingTracker.id },
      data: {
        dials: data.dials,
        pointsData: data.pointsData,
        totalPoints: data.totalPoints,
        schedule: data.schedule,
        prospecting: data.prospecting,
        notes: data.notes
      }
    });
  } else {
    await prisma.dailyTracker.create({
      data: {
        agentId,
        date: new Date(),
        dials: data.dials,
        pointsData: data.pointsData,
        totalPoints: data.totalPoints,
        schedule: data.schedule,
        prospecting: data.prospecting,
        notes: data.notes
      }
    });
  }

  revalidatePath('/daily-tracker');
}

export async function addProspect(agentId: string, data: FormData) {
  const clientName = data.get('clientName') as string;
  const address = data.get('address') as string;
  const type = data.get('type') as string;
  const estimatedSalesPrice = data.get('estimatedSalesPrice') ? parseFloat(data.get('estimatedSalesPrice') as string) : null;

  await prisma.prospect.create({
    data: {
      clientName,
      address,
      type,
      estimatedSalesPrice,
      agentId
    }
  });

  revalidatePath(`/agents/${agentId}`);
}

export async function deleteProspect(prospectId: string, agentId: string) {
  await prisma.prospect.delete({ where: { id: prospectId } });
  revalidatePath(`/agents/${agentId}`);
}

export async function convertProspectToDeal(prospectId: string, agentId: string) {
  const prospect = await prisma.prospect.findUnique({ where: { id: prospectId } });
  if (!prospect) return;

  // Create the Deal
  await prisma.deal.create({
    data: {
      address: prospect.address,
      clientName: prospect.clientName,
      type: prospect.type,
      salesPrice: prospect.estimatedSalesPrice,
      commissionPercentage: 3, // Defaulting to 3%, admin can edit later
      dateClosed: new Date(),
      agentId
    }
  });

  // Delete the Prospect
  await prisma.prospect.delete({ where: { id: prospectId } });

  revalidatePath(`/agents/${agentId}`);
  revalidatePath('/');
}
