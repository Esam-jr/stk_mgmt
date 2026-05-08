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

  const variants = await prisma.productVariant.findMany({
    where: filterBranchId ? { product: { branchId: filterBranchId } } : undefined,
    include: {
      product: {
        include: { branch: true, category: true, brand: true },
      },
    },
  });

  // Calculate total valuation
  const inventoryValue = variants.reduce((acc: number, item) => acc + (Number(item.product.priceIn) * item.quantity), 0);
  const potentialRevenue = variants.reduce((acc: number, item) => acc + (Number(item.product.sellingPrice) * item.quantity), 0);
  const lowStockCount = variants.filter((item) => item.quantity < 10).length;
  const stocks = variants.map((variant) => ({
    id: variant.id,
    productId: variant.productId,
    name: variant.product.name,
    brand: variant.product.brand.name,
    category: variant.product.category.name,
    size: variant.size,
    color: variant.color,
    barcode: variant.barcode,
    quantity: variant.quantity,
    priceIn: Number(variant.product.priceIn),
    sellingPrice: Number(variant.product.sellingPrice),
    branch: variant.product.branch,
  }));

  return Response.json({
    totalItems: variants.length,
    inventoryValue,
    potentialRevenue,
    lowStockCount,
    stocks,
  });
}
