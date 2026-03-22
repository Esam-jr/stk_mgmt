import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const stockSchema = z.object({
  category: z.string().min(1),
  brand: z.string().min(1),
  size: z.string().min(1),
  quantity: z.number().int().min(0),
  priceIn: z.number().positive(),
  sellingPrice: z.number().positive(),
  branchId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const branchId = searchParams.get("branchId");

  const stocks = await prisma.stock.findMany({
    where: branchId ? { branchId } : undefined,
    include: { branch: true },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(stocks);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "MAIN_ADMIN" && role !== "SUPER_ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = stockSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const stock = await prisma.stock.create({ data: parsed.data, include: { branch: true } });
  return Response.json(stock, { status: 201 });
}
