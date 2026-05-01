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

  const [branch, variants, salesLast30Days, salesUsersCount, transferInCount, transferOutCount] = await Promise.all([
    prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, name: true, location: true },
    }),
    prisma.productVariant.findMany({
      where: { product: { branchId } },
      select: {
        quantity: true,
        product: {
          select: {
            priceIn: true,
            sellingPrice: true,
          },
        },
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
        productVariant: {
          select: {
            product: {
              select: {
                priceIn: true,
                sellingPrice: true,
              },
            },
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

  const totalSkus = variants.length;
  const totalUnits = variants.reduce((acc, item) => acc + item.quantity, 0);
  const inventoryValue = variants.reduce((acc, item) => acc + item.quantity * Number(item.product.priceIn), 0);
  const potentialRevenue = variants.reduce((acc, item) => acc + item.quantity * Number(item.product.sellingPrice), 0);
  const lowStockCount = variants.filter((item) => item.quantity < 10).length;

  const salesRevenue30d = salesLast30Days.reduce(
    (acc, sale) => acc + sale.quantity * Number(sale.productVariant.product.sellingPrice),
    0
  );
  const salesProfit30d = salesLast30Days.reduce(
    (acc, sale) => acc + sale.quantity * (Number(sale.productVariant.product.sellingPrice) - Number(sale.productVariant.product.priceIn)),
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
