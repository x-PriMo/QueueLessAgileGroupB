import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding admin user...')

  const email = process.env.ADMIN_EMAIL || 'admin@queueless.com'
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const displayName = 'Platform Admin'

  const passwordHash = await bcrypt.hash(password, 12)

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      displayName,
      passwordHash,
      platformRole: 'PLATFORM_ADMIN',
      isActive: true,
    },
    create: {
      email,
      displayName,
      passwordHash,
      platformRole: 'PLATFORM_ADMIN',
      isActive: true,
    },
  })

  console.log('✅ Admin seeded:', { id: admin.id, email: admin.email, platformRole: admin.platformRole })

  console.log('🌱 Seeding demo company...')

  const company = await prisma.company.upsert({
    where: { slug: 'demo-salon' },
    update: {
      name: 'Demo Salon',
      category: 'BEAUTY',
      city: 'Warszawa',
      address: 'ul. Przykładowa 1',
      phone: '+48 123 456 789',
      contactEmail: 'kontakt@demosalon.pl',
      description: 'Przykładowa firma do testów',
      isActive: true,
    },
    create: {
      slug: 'demo-salon',
      name: 'Demo Salon',
      category: 'BEAUTY',
      city: 'Warszawa',
      address: 'ul. Przykładowa 1',
      phone: '+48 123 456 789',
      contactEmail: 'kontakt@demosalon.pl',
      description: 'Przykładowa firma do testów',
      isActive: true,
    },
  })

  await prisma.companySettings.upsert({
    where: { companyId: company.id },
    update: {
      allowWalkIns: true,
      allowReservations: true,
      autoAcceptReservations: true,
    },
    create: {
      companyId: company.id,
      allowWalkIns: true,
      allowReservations: true,
      autoAcceptReservations: true,
    },
  })

  await prisma.companyMembership.upsert({
    where: { userId_companyId: { userId: admin.id, companyId: company.id } },
    update: {
      role: 'OWNER',
      canServe: true,
      isActive: true,
    },
    create: {
      userId: admin.id,
      companyId: company.id,
      role: 'OWNER',
      canServe: true,
      isActive: true,
    },
  })

  console.log('✅ Demo company and membership seeded:', { company: company.name, owner: admin.email })
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
