import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  
  const role = (session.user as { role?: string }).role;
  if (role !== "SUPER_ADMIN" && role !== "MAIN_ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const branchId = searchParams.get("branchId");
  const userBranchId = (session.user as { branchId?: string }).branchId;

  // Main admin can only see their branch if they are restricted
  // But per specs, MAIN_ADMIN sees ALL branches. Let's allow branchId filtering.
  const filterBranchId = role === "MAIN_ADMIN" && userBranchId ? userBranchId : branchId;

  // Group sales by date for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sales = await prisma.sale.findMany({
    where: {
      createdAt: { gte: thirtyDaysAgo },
      ...(filterBranchId ? { branchId: filterBranchId } : {}),
    },
    include: { stock: true },
    orderBy: { createdAt: "asc" },
  });

  // Aggregate by date
  const aggregated = sales.reduce((acc: any, sale: any) => {
    const date = sale.createdAt.toISOString().split("T")[0];
    if (!acc[date]) {
      acc[date] = { date, revenue: 0, profit: 0, count: 0 };
    }
    const currentRevenue = sale.stock.sellingPrice * sale.quantity;
    const currentCost = sale.stock.priceIn * sale.quantity;
    acc[date].revenue += currentRevenue;
    acc[date].profit += (currentRevenue - currentCost);
    acc[date].count += sale.quantity;
    return acc;
  }, {} as Record<string, { date: string; revenue: number; profit: number; count: number }>);

  return Response.json(Object.values(aggregated));
}
