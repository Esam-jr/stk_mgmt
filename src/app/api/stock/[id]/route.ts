import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const updateStockSchema = z.object({
  category: z.string().min(1).optional(),
  brand: z.string().min(1).optional(),
  size: z.string().min(1).optional(),
  quantity: z.number().int().min(0).optional(),
  priceIn: z.number().positive().optional(),
  sellingPrice: z.number().positive().optional(),
  branchId: z.string().min(1).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "MAIN_ADMIN" && role !== "SUPER_ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateStockSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const stock = await prisma.stock.update({ where: { id }, data: parsed.data, include: { branch: true } });
  return Response.json(stock);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "MAIN_ADMIN" && role !== "SUPER_ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.stock.delete({ where: { id } });
  return Response.json({ success: true });
}
