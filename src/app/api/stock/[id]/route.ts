import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { z } from "zod";

const updateStockSchema = z.object({
  name: z.string().min(1).optional(),
  brandId: z.string().min(1).optional(),
  size: z.string().min(1).optional(),
  color: z.string().optional().nullable(),
  quantity: z.coerce.number().int().min(0).optional(),
  priceIn: z.coerce.number().positive().optional(),
  sellingPrice: z.coerce.number().positive().optional(),
  categoryId: z.string().min(1).optional(),
  branchId: z.string().min(1).optional(),
  barcode: z.string().optional().nullable(),
});

function validatePricePair(priceIn: number, sellingPrice: number) {
  if (sellingPrice <= priceIn) {
    throw new Error("Sell price must be higher than buy price");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "MAIN_ADMIN" && role !== "SUPER_ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateStockSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const stock = await prisma.$transaction(async (tx) => {
    const existing = await tx.productVariant.findUnique({
      where: { id },
      include: { product: true },
    });
    if (!existing) throw new Error("Variant not found");
    const nextPriceIn = parsed.data.priceIn ?? Number(existing.product.priceIn);
    const nextSellingPrice = parsed.data.sellingPrice ?? Number(existing.product.sellingPrice);
    validatePricePair(nextPriceIn, nextSellingPrice);

    const updatedProduct = await tx.product.update({
      where: { id: existing.productId },
      data: {
        ...(parsed.data.name ? { name: parsed.data.name } : {}),
        ...(parsed.data.brandId ? { brandId: parsed.data.brandId } : {}),
        ...(parsed.data.priceIn !== undefined ? { priceIn: parsed.data.priceIn } : {}),
        ...(parsed.data.sellingPrice !== undefined ? { sellingPrice: parsed.data.sellingPrice } : {}),
        ...(parsed.data.categoryId ? { categoryId: parsed.data.categoryId } : {}),
        ...(parsed.data.branchId ? { branchId: parsed.data.branchId } : {}),
      },
    });

    const updatedVariant = await tx.productVariant.update({
      where: { id },
      data: {
        ...(parsed.data.size ? { size: parsed.data.size } : {}),
        ...(parsed.data.color !== undefined ? { color: parsed.data.color || null } : {}),
        ...(parsed.data.quantity !== undefined ? { quantity: parsed.data.quantity } : {}),
        ...(parsed.data.barcode !== undefined ? { barcode: parsed.data.barcode || undefined } : {}),
      },
      include: {
        product: { include: { category: true, brand: true, branch: true } },
      },
    });

    await logActivity(tx, {
      action: "STOCK_UPDATE",
      entityType: "ProductVariant",
      entityId: updatedVariant.id,
      actorId: session.user.id,
      description: `Updated stock variant ${updatedVariant.product.brand.name} ${updatedVariant.product.name} (${updatedVariant.size}${updatedVariant.color ? `/${updatedVariant.color}` : ""})`,
      metadata: {
        quantity: updatedVariant.quantity,
        branchId: updatedVariant.product.branchId,
      },
    });

    return {
      id: updatedVariant.id,
      productId: updatedVariant.productId,
      name: updatedVariant.product.name,
      brand: updatedVariant.product.brand.name,
      brandId: updatedVariant.product.brandId,
      category: updatedVariant.product.category.name,
      categoryId: updatedVariant.product.categoryId,
      size: updatedVariant.size,
      color: updatedVariant.color,
      quantity: updatedVariant.quantity,
      barcode: updatedVariant.barcode,
      priceIn: Number(updatedProduct.priceIn),
      sellingPrice: Number(updatedProduct.sellingPrice),
      branchId: updatedVariant.product.branchId,
      branch: updatedVariant.product.branch,
      createdAt: updatedVariant.createdAt,
      updatedAt: updatedVariant.updatedAt,
    };
  });

  return Response.json(stock);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "MAIN_ADMIN" && role !== "SUPER_ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.$transaction(async (tx) => {
    const variant = await tx.productVariant.findUnique({
      where: { id },
      include: { product: { include: { brand: true } } },
    });
    if (!variant) return;

    await tx.productVariant.update({
      where: { id },
      data: { isActive: false },
    });

    await logActivity(tx, {
      action: "STOCK_DELETE",
      entityType: "ProductVariant",
      entityId: id,
      actorId: session.user.id,
      description: `Deleted (soft) stock variant ${variant.product.brand.name} ${variant.product.name} (${variant.size}${variant.color ? `/${variant.color}` : ""})`,
      metadata: {
        branchId: variant.product.branchId,
      },
    });
  });
  return Response.json({ success: true });
}
