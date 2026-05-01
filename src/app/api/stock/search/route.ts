import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  const userBranchId = (session.user as { branchId?: string }).branchId;

  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q") ?? "";
  const branchId = searchParams.get("branchId");
  const effectiveBranchId = role === "SALES" ? userBranchId : branchId;

  const variants = await prisma.productVariant.findMany({
    where: {
      AND: [
        effectiveBranchId ? { product: { branchId: effectiveBranchId } } : {},
        {
          OR: [
            { product: { brand: { contains: query, mode: "insensitive" } } },
            { product: { name: { contains: query, mode: "insensitive" } } },
            { product: { category: { name: { contains: query, mode: "insensitive" } } } },
            { barcode: { contains: query, mode: "insensitive" } },
            { size: { contains: query, mode: "insensitive" } },
            { color: { contains: query, mode: "insensitive" } },
          ],
        },
      ],
    },
    include: {
      product: { include: { category: true, branch: true } },
    },
    take: 20,
  });

  return Response.json(
    variants.map((variant) => ({
      id: variant.id,
      productId: variant.productId,
      name: variant.product.name,
      brand: variant.product.brand,
      category: variant.product.category.name,
      size: variant.size,
      color: variant.color,
      barcode: variant.barcode,
      quantity: variant.quantity,
      sellingPrice: Number(variant.product.sellingPrice),
      priceIn: Number(variant.product.priceIn),
      branch: variant.product.branch,
    }))
  );
}
