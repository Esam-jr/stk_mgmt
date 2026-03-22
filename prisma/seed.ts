import "dotenv/config";
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool as any)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  // 1. Create Branches
  const mainBranch = await prisma.branch.create({
    data: { name: 'Main HQ', location: 'Downtown' },
  })

  const branchB = await prisma.branch.create({
    data: { name: 'Branch B', location: 'Uptown' },
  })

  // 2. Create Users
  const superAdminPassword = await bcrypt.hash('password123', 10)
  await prisma.user.create({ 
    data: {
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@stk.com',
      password: superAdminPassword,
      role: 'SUPER_ADMIN',
    },
  })

  const mainAdminPassword = await bcrypt.hash('password123', 10)
  await prisma.user.create({
    data: {
      firstName: 'Main',
      lastName: 'Manager',
      email: 'manager@stk.com',
      password: mainAdminPassword,
      role: 'MAIN_ADMIN',
    },
  })

  const salesPassword = await bcrypt.hash('password123', 10)
  await prisma.user.create({
    data: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'sales1@stk.com',
      password: salesPassword,
      role: 'SALES',
      branchId: mainBranch.id,
    },
  })

  // 3. Create Sample Stock
  await prisma.stock.createMany({
    data: [
      {
        category: 'T-Shirts',
        brand: 'Nike',
        size: 'M',
        quantity: 100,
        priceIn: 15.0,
        sellingPrice: 35.0,
        branchId: mainBranch.id,
      },
      {
        category: 'T-Shirts',
        brand: 'Nike',
        size: 'L',
        quantity: 50,
        priceIn: 15.0,
        sellingPrice: 35.0,
        branchId: mainBranch.id,
      },
      {
        category: 'Shoes',
        brand: 'Adidas',
        size: '42',
        quantity: 30,
        priceIn: 45.0,
        sellingPrice: 120.0,
        branchId: branchB.id,
      },
    ],
  })

  console.log('Database seeded successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
