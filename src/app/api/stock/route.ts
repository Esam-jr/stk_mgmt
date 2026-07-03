import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { Prisma } from "@prisma/client";
import { z } from "zod";

async function generateThreeDigitBarcode(tx: Prisma.TransactionClient): Promise<string> {
  for (let attempts = 0; attempts < 50; attempts += 1) {
    const candidate = String(100 + Math.floor(Math.random() * 900));
    const exists = await tx.productVariant.findUnique({ where: { barcode: candidate } });
    if (!exists) return candidate;
  }
  throw new Error("Unable to generate unique 3-digit stock code");
}

const stockSchema = z
  .object({
    name: z.string().min(1),
    brandId: z.string().min(1),
    categoryId: z.string().min(1),
    size: z.string().min(1),
    color: z.string().optional().nullable(),
    quantity: z.coerce.number().int().min(0),
    priceIn: z.coerce.number().positive(),
    sellingPrice: z.coerce.number().positive(),
    branchId: z.string().min(1),
    barcode: z.string().regex(/^\d{3}$/, "Code must be exactly 3 digits").optional().nullable(),
  })
  .refine((data) => data.sellingPrice > data.priceIn, {
    path: ["sellingPrice"],
    message: "Sell price must be higher than buy price",
  });

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const branchId = searchParams.get("branchId");

  const variants = await prisma.productVariant.findMany({
    where: {
      isActive: true,
      ...(branchId ? { product: { branchId } } : {}),
    },
    include: {
      product: { include: { category: true, brand: true, branch: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const stocks = variants.map((variant) => ({
    id: variant.id,
    productId: variant.productId,
    name: variant.product.name,
    brand: variant.product.brand.name,
    brandId: variant.product.brandId,
    category: variant.product.category.name,
    categoryId: variant.product.categoryId,
    size: variant.size,
    color: variant.color,
    quantity: variant.quantity,
    barcode: variant.barcode,
    priceIn: Number(variant.product.priceIn),
    sellingPrice: Number(variant.product.sellingPrice),
    branchId: variant.product.branchId,
    branch: variant.product.branch,
    createdAt: variant.createdAt,
    updatedAt: variant.updatedAt,
  }));

  return Response.json(stocks);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "MAIN_ADMIN" && role !== "SUPER_ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = stockSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const stock = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: {
        name: parsed.data.name,
        brandId: parsed.data.brandId,
        categoryId: parsed.data.categoryId,
        branchId: parsed.data.branchId,
        priceIn: parsed.data.priceIn,
        sellingPrice: parsed.data.sellingPrice,
      },
    });

    const productRecord =
      product ??
      (await tx.product.create({
        data: {
          name: parsed.data.name,
          brandId: parsed.data.brandId,
          categoryId: parsed.data.categoryId,
          branchId: parsed.data.branchId,
          priceIn: parsed.data.priceIn,
          sellingPrice: parsed.data.sellingPrice,
        },
      }));

    const variant = await tx.productVariant.create({
      data: {
        productId: productRecord.id,
        size: parsed.data.size,
        color: parsed.data.color || null,
        quantity: parsed.data.quantity,
        barcode: parsed.data.barcode || (await generateThreeDigitBarcode(tx)),
      },
      include: {
        product: { include: { category: true, brand: true, branch: true } },
      },
    });

    await logActivity(tx, {
      action: "STOCK_CREATE",
      entityType: "ProductVariant",
      entityId: variant.id,
      actorId: session.user.id,
      description: `Added stock variant ${variant.product.brand.name} ${variant.product.name} (${variant.size}${variant.color ? `/${variant.color}` : ""})`,
      metadata: {
        branchId: variant.product.branchId,
        quantity: variant.quantity,
      },
    });

    return {
      id: variant.id,
      productId: variant.productId,
      name: variant.product.name,
      brand: variant.product.brand.name,
      brandId: variant.product.brandId,
      category: variant.product.category.name,
      categoryId: variant.product.categoryId,
      size: variant.size,
      color: variant.color,
      quantity: variant.quantity,
      barcode: variant.barcode,
      priceIn: Number(variant.product.priceIn),
      sellingPrice: Number(variant.product.sellingPrice),
      branchId: variant.product.branchId,
      branch: variant.product.branch,
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt,
    };
  });

  return Response.json(stock, { status: 201 });
}
