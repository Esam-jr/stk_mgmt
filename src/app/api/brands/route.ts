import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
  });

  return Response.json(brands);
}

const brandSchema = z.object({
  name: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "SUPER_ADMIN" && role !== "MAIN_ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = brandSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const created = await prisma.brand.create({
    data: { name: parsed.data.name },
  });

  await logActivity(prisma, {
    action: "BRAND_CREATE",
    entityType: "Brand",
    entityId: created.id,
    actorId: session.user.id,
    description: `Created brand ${created.name}`,
  });

  return Response.json(created, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "SUPER_ADMIN" && role !== "MAIN_ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  try {
    const existing = await prisma.brand.findUnique({ where: { id } });
    await prisma.brand.delete({ where: { id } });
    await logActivity(prisma, {
      action: "BRAND_DELETE",
      entityType: "Brand",
      entityId: id,
      actorId: session.user.id,
      description: `Deleted brand ${existing?.name ?? id}`,
    });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Brand is in use or not found" }, { status: 400 });
  }
}
