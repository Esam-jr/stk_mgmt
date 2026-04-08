import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const saleSchema = z.object({
  paymentMethod: z.enum(["CASH", "TRANSFER"]),
  items: z.array(
    z.object({
      stockId: z.string().min(1),
      quantity: z.number().int().min(1),
    })
  ).min(1),
});

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const branchId = searchParams.get("branchId");
  const role = (session.user as { role?: string }).role;
  const userBranchId = (session.user as { branchId?: string }).branchId;
  const userId = session.user.id;

  // Sales users can only see their own sales records (from their branch).
  const where =
    role === "SALES"
      ? { branchId: userBranchId, soldById: userId }
      : branchId
      ? { branchId }
      : undefined;

  const sales = await prisma.sale.findMany({
    where,
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

  const { items, paymentMethod } = parsed.data;

  // Use transaction to ensure stock consistency
  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const saleRecords: any[] = [];

      for (const item of items) {
        const stock = await tx.stock.findUnique({ where: { id: item.stockId } });
        if (!stock) throw new Error("Stock not found");
        if (stock.branchId !== userBranchId) throw new Error("Stock is not in your branch");
        if (stock.quantity < item.quantity) {
          throw new Error(`Insufficient stock for ${stock.brand} ${stock.category} (${stock.size})`);
        }

        await tx.stock.update({
          where: { id: item.stockId },
          data: { quantity: stock.quantity - item.quantity },
        });

        const createdSale = await tx.sale.create({
          data: {
            stockId: item.stockId,
            quantity: item.quantity,
            paymentMethod,
            soldById: session.user.id,
            branchId: userBranchId,
          },
          include: { stock: true },
        });

        saleRecords.push(createdSale);
      }

      return saleRecords;
    });

    return Response.json({ sales: result }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Sale failed" }, { status: 400 });
  }
}
