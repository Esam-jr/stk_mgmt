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

  const filterBranchId = role === "MAIN_ADMIN" && userBranchId ? userBranchId : branchId;

  const stocks = await prisma.stock.findMany({
    where: filterBranchId ? { branchId: filterBranchId } : undefined,
    include: { branch: true },
  });

  // Calculate total valuation
  const inventoryValue = stocks.reduce((acc: any, stock: any) => acc + (stock.priceIn * stock.quantity), 0);
  const potentialRevenue = stocks.reduce((acc: any, stock: any) => acc + (stock.sellingPrice * stock.quantity), 0);
  const lowStockCount = stocks.filter((stock: any) => stock.quantity < 10).length;

  return Response.json({
    totalItems: stocks.length,
    inventoryValue,
    potentialRevenue,
    lowStockCount,
    stocks,
  });
}
