import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const stockSchema = z.object({
  name: z.string().min(1),
  brandId: z.string().min(1),
  categoryId: z.string().min(1),
  size: z.string().min(1),
  color: z.string().optional().nullable(),
  quantity: z.coerce.number().int().min(0),
  priceIn: z.coerce.number().positive(),
  sellingPrice: z.coerce.number().positive(),
  branchId: z.string().min(1),
  barcode: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const branchId = searchParams.get("branchId");

  const variants = await prisma.productVariant.findMany({
    where: branchId ? { product: { branchId } } : undefined,
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
        barcode: parsed.data.barcode || undefined,
      },
      include: {
        product: { include: { category: true, brand: true, branch: true } },
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
