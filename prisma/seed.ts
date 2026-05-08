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

async function getOrCreateBranch(name: string, location: string) {
  const branch = await prisma.branch.findFirst({ where: { name, location } })
  if (branch) return branch

  return prisma.branch.create({
    data: { name, location },
  })
}

async function ensureCredentialAccount(userId: string, email: string, password: string) {
  const account = await prisma.account.findFirst({
    where: { userId, providerId: "credential" },
  })

  if (account) {
    await prisma.account.update({
      where: { id: account.id },
      data: {
        accountId: email,
        password,
      },
    })
    return
  }

  await prisma.account.create({
    data: {
      userId,
      accountId: email,
      providerId: "credential",
      password,
    },
  })
}

async function upsertProductWithVariants({
  name,
  brandId,
  categoryId,
  branchId,
  priceIn,
  sellingPrice,
  variants,
}: {
  name: string
  brandId: string
  categoryId: string
  branchId: string
  priceIn: number
  sellingPrice: number
  variants: { size: string; color: string; quantity: number }[]
}) {
  const product =
    (await prisma.product.findFirst({
      where: { name, brandId, categoryId, branchId },
    })) ??
    (await prisma.product.create({
      data: {
        name,
        brandId,
        categoryId,
        branchId,
        priceIn,
        sellingPrice,
      },
    }))

  await prisma.product.update({
    where: { id: product.id },
    data: {
      priceIn,
      sellingPrice,
    },
  })

  await Promise.all(
    variants.map((variant) =>
      prisma.productVariant.upsert({
        where: {
          productId_size_color: {
            productId: product.id,
            size: variant.size,
            color: variant.color,
          },
        },
        update: { quantity: variant.quantity },
        create: {
          productId: product.id,
          size: variant.size,
          color: variant.color,
          quantity: variant.quantity,
        },
      })
    )
  )

  return product
}

async function main() {
  console.log('Seeding database...')

  // 1. Create Branches
  const mainBranch = await getOrCreateBranch('Main HQ', 'Downtown')
  const branchB = await getOrCreateBranch('Branch B', 'Uptown')

  // 2. Create Users
  const superAdminPassword = await hashPassword('password123')
  const superAdmin = await prisma.user.upsert({ 
    where: { email: 'admin@stk.com' },
    update: {
      firstName: 'Super',
      lastName: 'Admin',
      password: superAdminPassword,
      role: 'SUPER_ADMIN',
      branchId: null,
    },
    create: {
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@stk.com',
      password: superAdminPassword,
      role: 'SUPER_ADMIN',
    },
  })
  await ensureCredentialAccount(superAdmin.id, 'admin@stk.com', superAdminPassword)

  const mainAdminPassword = await hashPassword('password123')
  const mainAdmin = await prisma.user.upsert({
    where: { email: 'manager@stk.com' },
    update: {
      firstName: 'Main',
      lastName: 'Manager',
      password: mainAdminPassword,
      role: 'MAIN_ADMIN',
      branchId: null,
    },
    create: {
      firstName: 'Main',
      lastName: 'Manager',
      email: 'manager@stk.com',
      password: mainAdminPassword,
      role: 'MAIN_ADMIN',
    },
  })
  await ensureCredentialAccount(mainAdmin.id, 'manager@stk.com', mainAdminPassword)

  const salesPassword = await hashPassword('password123')
  const salesUser = await prisma.user.upsert({
    where: { email: 'sales1@stk.com' },
    update: {
      firstName: 'John',
      lastName: 'Doe',
      password: salesPassword,
      role: 'SALES',
      branchId: mainBranch.id,
    },
    create: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'sales1@stk.com',
      password: salesPassword,
      role: 'SALES',
      branchId: mainBranch.id,
    },
  })
  await ensureCredentialAccount(salesUser.id, 'sales1@stk.com', salesPassword)

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

  const nikeBrand = await prisma.brand.upsert({
    where: { name: "Nike" },
    update: {},
    create: { name: "Nike" },
  })

  const adidasBrand = await prisma.brand.upsert({
    where: { name: "Adidas" },
    update: {},
    create: { name: "Adidas" },
  })

  const nikeTShirt = await upsertProductWithVariants({
    name: "Classic Tee",
    brandId: nikeBrand.id,
    categoryId: tShirtCategory.id,
    branchId: mainBranch.id,
    priceIn: 15.0,
    sellingPrice: 35.0,
    variants: [
      { size: "M", color: "Black", quantity: 100 },
      { size: "L", color: "Black", quantity: 50 },
    ],
  })

  await upsertProductWithVariants({
    name: "Runner Shoe",
    brandId: adidasBrand.id,
    categoryId: shoesCategory.id,
    branchId: branchB.id,
    priceIn: 45.0,
    sellingPrice: 120.0,
    variants: [{ size: "42", color: "White", quantity: 30 }],
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
