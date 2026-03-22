import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const saleSchema = z.object({
  stockId: z.string().min(1),
  quantity: z.number().int().min(1),
  paymentMethod: z.enum(["CASH", "TRANSFER"]),
});

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const branchId = searchParams.get("branchId");
  const role = (session.user as { role?: string }).role;
  const userBranchId = (session.user as { branchId?: string }).branchId;

  // Restrict Sales to their own branch
  const effectiveBranchId = role === "SALES" ? userBranchId : branchId;

  const sales = await prisma.sale.findMany({
    where: effectiveBranchId ? { branchId: effectiveBranchId } : undefined,
    include: {
      stock: true,
      soldBy: { select: { id: true, firstName: true, lastName: true } },
      branch: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(sales);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  const userBranchId = (session.user as { branchId?: string }).branchId;

  if (role !== "SALES") {
    return Response.json({ error: "Only sales users can make sales" }, { status: 403 });
  }

  if (!userBranchId) {
    return Response.json({ error: "Sales user not assigned to a branch" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = saleSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const { stockId, quantity, paymentMethod } = parsed.data;

  // Use transaction to ensure stock consistency
  try {
    const sale = await prisma.$transaction(async (tx: any) => {
      const stock = await tx.stock.findUnique({ where: { id: stockId } });
      
      if (!stock) throw new Error("Stock not found");
      if (stock.branchId !== userBranchId) throw new Error("Stock is not in your branch");
      if (stock.quantity < quantity) throw new Error("Insufficient stock");

      await tx.stock.update({
        where: { id: stockId },
        data: { quantity: stock.quantity - quantity },
      });

      return await tx.sale.create({
        data: {
          stockId,
          quantity,
          paymentMethod,
          soldById: session.user.id,
          branchId: userBranchId,
        },
        include: { stock: true },
      });
    });

    return Response.json(sale, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Sale failed" }, { status: 400 });
  }
}
