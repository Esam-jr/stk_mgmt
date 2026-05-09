import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { z } from "zod";

const returnSchema = z.object({
  saleId: z.string().min(1),
  quantity: z.number().int().min(1),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = returnSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const role = (session.user as { role?: string }).role;
  const userBranchId = (session.user as { branchId?: string }).branchId;
  const { saleId, quantity } = parsed.data;

  try {
    const saleReturn = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        include: {
          productVariant: {
            include: {
              product: {
                include: { brand: true },
              },
            },
          },
          saleReturns: true,
        },
      });

      if (!sale) throw new Error("Sale not found");
      if (role === "SALES" && sale.branchId !== userBranchId) {
        throw new Error("Returns are only allowed for your branch");
      }

      const returnedQty = sale.saleReturns.reduce((acc, item) => acc + item.quantity, 0);
      const remainingQty = sale.quantity - returnedQty;
      if (remainingQty <= 0) {
        throw new Error("This sale has already been fully returned");
      }
      if (quantity > remainingQty) {
        throw new Error(`Cannot return more than ${remainingQty} remaining unit(s)`);
      }

      await tx.productVariant.update({
        where: { id: sale.productVariantId },
        data: { quantity: { increment: quantity } },
      });

      const createdReturn = await tx.saleReturn.create({
        data: {
          saleId,
          productVariantId: sale.productVariantId,
          quantity,
          refundedById: session.user.id,
          branchId: sale.branchId,
        },
      });

      await logActivity(tx, {
        action: "SALE_RETURN",
        entityType: "SaleReturn",
        entityId: createdReturn.id,
        actorId: session.user.id,
        description: `Returned ${quantity} unit(s) of ${sale.productVariant.product.brand.name} ${sale.productVariant.product.name} (${sale.productVariant.size})`,
        metadata: {
          saleId,
          productVariantId: sale.productVariantId,
          quantity,
          branchId: sale.branchId,
        },
      });

      return createdReturn;
    });

    return Response.json(saleReturn, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Return failed" }, { status: 400 });
  }
}
