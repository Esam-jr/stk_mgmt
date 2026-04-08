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

  const stocks = await prisma.stock.findMany({
    where: {
      AND: [
        effectiveBranchId ? { branchId: effectiveBranchId } : {},
        {
          OR: [
            { brand: { contains: query, mode: "insensitive" } },
            { category: { contains: query, mode: "insensitive" } },
            { barcode: { contains: query, mode: "insensitive" } },
            { size: { contains: query, mode: "insensitive" } },
          ],
        },
      ],
    },
    include: { branch: true },
    take: 20,
  });
  return Response.json(stocks);
}
