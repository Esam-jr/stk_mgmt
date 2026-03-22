import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const transferSchema = z.object({
  stockId: z.string().min(1),
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
      stock: true,
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

  const { stockId, toBranchId, quantity } = parsed.data;

  try {
    const transfer = await prisma.$transaction(async (tx: any) => {
      const sourceStock = await tx.stock.findUnique({ where: { id: stockId } });
      if (!sourceStock) throw new Error("Stock not found");
      if (sourceStock.quantity < quantity) throw new Error("Insufficient stock for transfer");
      if (sourceStock.branchId === toBranchId) throw new Error("Cannot transfer to the same branch");

      // Decrement source
      await tx.stock.update({
        where: { id: stockId },
        data: { quantity: sourceStock.quantity - quantity },
      });

      // Find or create identical stock in target branch
        const targetStock = await tx.stock.findFirst({
          where: {
            category: sourceStock.category,
            brand: sourceStock.brand,
            size: sourceStock.size,
            branchId: toBranchId,
          },
        });

        if (targetStock) {
          await tx.stock.update({
            where: { id: targetStock.id },
            data: { quantity: targetStock.quantity + quantity },
          });
        } else {
          await tx.stock.create({
            data: {
              category: sourceStock.category,
              brand: sourceStock.brand,
              size: sourceStock.size,
              barcode: crypto.randomUUID(), // New barcode for target branch if it doesn't exist
              priceIn: sourceStock.priceIn,
              sellingPrice: sourceStock.sellingPrice,
              quantity: quantity,
              branchId: toBranchId,
            },
          });
        }

        // Record transfer
        return await tx.stockTransfer.create({
          data: {
            stockId,
            fromBranchId: sourceStock.branchId,
            toBranchId,
            quantity,
            transferredById: session.user.id,
          },
        });
      });

      return Response.json(transfer, { status: 201 });
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : "Transfer failed" }, { status: 400 });
    }
  }
