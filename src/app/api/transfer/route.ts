import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const transferSchema = z.object({
  productVariantId: z.string().min(1),
  toBranchId: z.string().min(1),
  quantity: z.number().int().min(1),
});

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "SUPER_ADMIN" && role !== "MAIN_ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const transfers = await prisma.stockTransfer.findMany({
    include: {
      productVariant: {
        include: {
          product: {
            include: { category: true },
          },
        },
      },
      fromBranch: true,
      toBranch: true,
      transferredBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(transfers);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "SUPER_ADMIN" && role !== "MAIN_ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = transferSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const { productVariantId, toBranchId, quantity } = parsed.data;

  try {
    const transfer = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const sourceVariant = await tx.productVariant.findUnique({
        where: { id: productVariantId },
        include: { product: true },
      });
      if (!sourceVariant) throw new Error("Variant not found");
      if (sourceVariant.quantity < quantity) throw new Error("Insufficient stock for transfer");
      if (sourceVariant.product.branchId === toBranchId) throw new Error("Cannot transfer to the same branch");

      // Decrement source
      await tx.productVariant.update({
        where: { id: productVariantId },
        data: { quantity: sourceVariant.quantity - quantity },
      });

      // Find or create product in target branch
      let targetProduct = await tx.product.findFirst({
        where: {
          name: sourceVariant.product.name,
          brandId: sourceVariant.product.brandId,
          categoryId: sourceVariant.product.categoryId,
          branchId: toBranchId,
          priceIn: sourceVariant.product.priceIn,
          sellingPrice: sourceVariant.product.sellingPrice,
        },
      });

      if (!targetProduct) {
        targetProduct = await tx.product.create({
          data: {
            name: sourceVariant.product.name,
            brandId: sourceVariant.product.brandId,
            categoryId: sourceVariant.product.categoryId,
            branchId: toBranchId,
            priceIn: sourceVariant.product.priceIn,
            sellingPrice: sourceVariant.product.sellingPrice,
          },
        });
      }

      // Find or create matching variant in target branch product.
      const targetVariant = await tx.productVariant.findFirst({
        where: {
          productId: targetProduct.id,
          size: sourceVariant.size,
          color: sourceVariant.color,
        },
      });

      if (targetVariant) {
        await tx.productVariant.update({
          where: { id: targetVariant.id },
          data: { quantity: targetVariant.quantity + quantity },
        });
      } else {
        await tx.productVariant.create({
          data: {
            productId: targetProduct.id,
            size: sourceVariant.size,
            color: sourceVariant.color,
            quantity,
            barcode: crypto.randomUUID(),
          },
        });
      }

      // Record transfer
      const createdTransfer = await tx.stockTransfer.create({
        data: {
          productVariantId,
          fromBranchId: sourceVariant.product.branchId,
          toBranchId,
          quantity,
          transferredById: session.user.id,
        },
        include: {
          productVariant: {
            include: {
              product: {
                include: { category: true },
              },
            },
          },
          fromBranch: true,
          toBranch: true,
          transferredBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      await logActivity(tx, {
        action: "TRANSFER_CREATE",
        entityType: "StockTransfer",
        entityId: createdTransfer.id,
        actorId: session.user.id,
        description: `Transferred ${quantity} unit(s) from branch ${sourceVariant.product.branchId} to ${toBranchId}`,
        metadata: {
          productVariantId,
          quantity,
          fromBranchId: sourceVariant.product.branchId,
          toBranchId,
        },
      });

      return createdTransfer;
      });

      return Response.json(transfer, { status: 201 });
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : "Transfer failed" }, { status: 400 });
    }
  }
