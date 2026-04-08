import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  const userBranchId = (session.user as { branchId?: string }).branchId;
  const { id: branchId } = await params;

  if (role !== "SUPER_ADMIN" && role !== "MAIN_ADMIN" && role !== "SALES") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (role === "SALES" && userBranchId !== branchId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const [branch, stocks, salesLast30Days, salesUsersCount, transferInCount, transferOutCount] = await Promise.all([
    prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, name: true, location: true },
    }),
    prisma.stock.findMany({
      where: { branchId },
      select: {
        quantity: true,
        priceIn: true,
        sellingPrice: true,
      },
    }),
    prisma.sale.findMany({
      where: {
        branchId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        stock: {
          select: {
            priceIn: true,
            sellingPrice: true,
          },
        },
      },
    }),
    prisma.user.count({
      where: {
        role: "SALES",
        branchId,
      },
    }),
    prisma.stockTransfer.count({ where: { toBranchId: branchId } }),
    prisma.stockTransfer.count({ where: { fromBranchId: branchId } }),
  ]);

  if (!branch) return Response.json({ error: "Branch not found" }, { status: 404 });

  const totalSkus = stocks.length;
  const totalUnits = stocks.reduce((acc, stock) => acc + stock.quantity, 0);
  const inventoryValue = stocks.reduce((acc, stock) => acc + stock.quantity * stock.priceIn, 0);
  const potentialRevenue = stocks.reduce((acc, stock) => acc + stock.quantity * stock.sellingPrice, 0);
  const lowStockCount = stocks.filter((stock) => stock.quantity < 10).length;

  const salesRevenue30d = salesLast30Days.reduce(
    (acc, sale) => acc + sale.quantity * sale.stock.sellingPrice,
    0
  );
  const salesProfit30d = salesLast30Days.reduce(
    (acc, sale) => acc + sale.quantity * (sale.stock.sellingPrice - sale.stock.priceIn),
    0
  );
  const unitsSold30d = salesLast30Days.reduce((acc, sale) => acc + sale.quantity, 0);

  return Response.json({
    branch,
    stats: {
      totalSkus,
      totalUnits,
      inventoryValue,
      potentialRevenue,
      lowStockCount,
      salesRevenue30d,
      salesProfit30d,
      unitsSold30d,
      salesUsersCount,
      transferInCount,
      transferOutCount,
    },
  });
}
