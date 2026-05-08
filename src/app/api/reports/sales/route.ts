import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Prisma } from "@prisma/client";

type SaleWithDetails = Prisma.SaleGetPayload<{
  include: {
    productVariant: {
      include: {
        product: {
          include: {
            brand: true;
            category: true;
          };
        };
      };
    };
    branch: true;
    soldBy: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
      };
    };
  };
}>;

type DailySales = {
  date: string;
  revenue: number;
  profit: number;
  count: number;
  transactions: number;
};

function toDateOnly(date: Date) {
  return date.toISOString().split("T")[0];
}

function getDateRange(searchParams: URLSearchParams) {
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");
  const end = endParam ? new Date(`${endParam}T23:59:59.999`) : new Date();
  const start = startParam ? new Date(`${startParam}T00:00:00.000`) : new Date(end);
  if (!startParam) start.setDate(start.getDate() - 30);

  return { start, end };
}

function aggregateDailySales(sales: SaleWithDetails[]) {
  const aggregated = sales.reduce<Record<string, DailySales>>((acc, sale) => {
    const date = toDateOnly(sale.createdAt);
    if (!acc[date]) {
      acc[date] = { date, revenue: 0, profit: 0, count: 0, transactions: 0 };
    }
    const currentRevenue = Number(sale.productVariant.product.sellingPrice) * sale.quantity;
    const currentCost = Number(sale.productVariant.product.priceIn) * sale.quantity;
    acc[date].revenue += currentRevenue;
    acc[date].profit += currentRevenue - currentCost;
    acc[date].count += sale.quantity;
    acc[date].transactions += 1;
    return acc;
  }, {});

  return Object.values(aggregated);
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  
  const role = (session.user as { role?: string }).role;
  if (role !== "SUPER_ADMIN" && role !== "MAIN_ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const branchId = searchParams.get("branchId");
  const detail = searchParams.get("detail") === "true";
  const userBranchId = (session.user as { branchId?: string }).branchId;

  // Main admin can only see their branch if they are restricted
  // But per specs, MAIN_ADMIN sees ALL branches. Let's allow branchId filtering.
  const filterBranchId = role === "MAIN_ADMIN" && userBranchId ? userBranchId : branchId;
  const { start, end } = getDateRange(searchParams);

  const sales = await prisma.sale.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      ...(filterBranchId ? { branchId: filterBranchId } : {}),
    },
    include: {
      productVariant: {
        include: {
          product: {
            include: {
              brand: true,
              category: true,
            },
          },
        },
      },
      branch: true,
      soldBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const daily = aggregateDailySales(sales);

  if (!detail) return Response.json(daily);

  const totals = sales.reduce(
    (acc, sale) => {
      const currentRevenue = Number(sale.productVariant.product.sellingPrice) * sale.quantity;
      const currentCost = Number(sale.productVariant.product.priceIn) * sale.quantity;
      acc.revenue += currentRevenue;
      acc.profit += currentRevenue - currentCost;
      acc.units += sale.quantity;
      acc.transactions += 1;
      return acc;
    },
    { revenue: 0, profit: 0, units: 0, transactions: 0 }
  );

  const byBranch = new Map<string, { branchId: string; branch: string; revenue: number; profit: number; units: number; transactions: number }>();
  const byCategory = new Map<string, { category: string; revenue: number; profit: number; units: number }>();
  const byPaymentMethod = new Map<string, { method: string; revenue: number; transactions: number }>();
  const byProduct = new Map<string, { product: string; brand: string; category: string; revenue: number; profit: number; units: number }>();

  for (const sale of sales) {
    const currentRevenue = Number(sale.productVariant.product.sellingPrice) * sale.quantity;
    const currentCost = Number(sale.productVariant.product.priceIn) * sale.quantity;
    const currentProfit = currentRevenue - currentCost;
    const product = sale.productVariant.product;

    const branchRow = byBranch.get(sale.branchId) ?? {
      branchId: sale.branchId,
      branch: sale.branch.name,
      revenue: 0,
      profit: 0,
      units: 0,
      transactions: 0,
    };
    branchRow.revenue += currentRevenue;
    branchRow.profit += currentProfit;
    branchRow.units += sale.quantity;
    branchRow.transactions += 1;
    byBranch.set(sale.branchId, branchRow);

    const categoryRow = byCategory.get(product.categoryId) ?? {
      category: product.category.name,
      revenue: 0,
      profit: 0,
      units: 0,
    };
    categoryRow.revenue += currentRevenue;
    categoryRow.profit += currentProfit;
    categoryRow.units += sale.quantity;
    byCategory.set(product.categoryId, categoryRow);

    const paymentRow = byPaymentMethod.get(sale.paymentMethod) ?? {
      method: sale.paymentMethod,
      revenue: 0,
      transactions: 0,
    };
    paymentRow.revenue += currentRevenue;
    paymentRow.transactions += 1;
    byPaymentMethod.set(sale.paymentMethod, paymentRow);

    const productKey = `${product.id}:${sale.productVariant.size}:${sale.productVariant.color ?? ""}`;
    const productRow = byProduct.get(productKey) ?? {
      product: `${product.name} (${sale.productVariant.size}${sale.productVariant.color ? ` / ${sale.productVariant.color}` : ""})`,
      brand: product.brand.name,
      category: product.category.name,
      revenue: 0,
      profit: 0,
      units: 0,
    };
    productRow.revenue += currentRevenue;
    productRow.profit += currentProfit;
    productRow.units += sale.quantity;
    byProduct.set(productKey, productRow);
  }

  return Response.json({
    range: {
      start: toDateOnly(start),
      end: toDateOnly(end),
    },
    totals,
    daily,
    byBranch: Array.from(byBranch.values()).sort((a, b) => b.revenue - a.revenue),
    byCategory: Array.from(byCategory.values()).sort((a, b) => b.revenue - a.revenue),
    byPaymentMethod: Array.from(byPaymentMethod.values()).sort((a, b) => b.revenue - a.revenue),
    topProducts: Array.from(byProduct.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    recentSales: sales.slice(-10).reverse().map((sale) => ({
      id: sale.id,
      date: sale.createdAt,
      branch: sale.branch.name,
      product: sale.productVariant.product.name,
      brand: sale.productVariant.product.brand.name,
      size: sale.productVariant.size,
      color: sale.productVariant.color,
      quantity: sale.quantity,
      paymentMethod: sale.paymentMethod,
      soldBy: `${sale.soldBy.firstName} ${sale.soldBy.lastName}`,
      revenue: Number(sale.productVariant.product.sellingPrice) * sale.quantity,
      profit:
        (Number(sale.productVariant.product.sellingPrice) - Number(sale.productVariant.product.priceIn)) *
        sale.quantity,
    })),
  });
}
