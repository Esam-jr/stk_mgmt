import "dotenv/config";
import { PrismaClient } from '@prisma/client'
import { hashPassword } from 'better-auth/crypto'

const prisma = new PrismaClient()

const STORE_CATEGORIES = [
  "Shoes",
  "T-shirt",
  "Shurab",
  "Shemiz",
  "Jacket",
  "Coat",
  "Jeans",
  "Suit trousers",
  "Tuta trousers",
  "Khaki",
  "Complete Tuta",
  "Suits",
]

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
  const superAdminPassword = await hashPassword('password123')
  await prisma.user.create({ 
    data: {
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@stk.com',
      password: superAdminPassword,
      role: 'SUPER_ADMIN',
      accounts: {
        create: {
          accountId: 'admin@stk.com',
          providerId: 'credential',
          password: superAdminPassword,
        }
      }
    },
  })

  const mainAdminPassword = await hashPassword('password123')
  await prisma.user.create({
    data: {
      firstName: 'Main',
      lastName: 'Manager',
      email: 'manager@stk.com',
      password: mainAdminPassword,
      role: 'MAIN_ADMIN',
      accounts: {
        create: {
          accountId: 'manager@stk.com',
          providerId: 'credential',
          password: mainAdminPassword,
        }
      }
    },
  })

  const salesPassword = await hashPassword('password123')
  await prisma.user.create({
    data: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'sales1@stk.com',
      password: salesPassword,
      role: 'SALES',
      branchId: mainBranch.id,
      accounts: {
        create: {
          accountId: 'sales1@stk.com',
          providerId: 'credential',
          password: salesPassword,
        }
      }
    },
  })

  // 3. Create Sample Stock
  const categories = await Promise.all(
    STORE_CATEGORIES.map((name) =>
      prisma.category.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  )

  const tShirtCategory = categories.find((category) => category.name === "T-shirt")
  const shoesCategory = categories.find((category) => category.name === "Shoes")
  if (!tShirtCategory || !shoesCategory) throw new Error("Missing required seed categories")

  const nikeTShirt = await prisma.product.create({
    data: {
      name: "Classic Tee",
      brand: "Nike",
      categoryId: tShirtCategory.id,
      branchId: mainBranch.id,
      priceIn: 15.0,
      sellingPrice: 35.0,
      variants: {
        create: [
          { size: "M", color: "Black", quantity: 100 },
          { size: "L", color: "Black", quantity: 50 },
        ],
      },
    },
  })

  await prisma.product.create({
    data: {
      name: "Runner Shoe",
      brand: "Adidas",
      categoryId: shoesCategory.id,
      branchId: branchB.id,
      priceIn: 45.0,
      sellingPrice: 120.0,
      variants: {
        create: [{ size: "42", color: "White", quantity: 30 }],
      },
    },
  })

  console.log(`Seeded product ${nikeTShirt.name} with variants`)

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
