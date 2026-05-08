import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return Response.json(categories);
}

const categorySchema = z.object({
  name: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "SUPER_ADMIN" && role !== "MAIN_ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const created = await prisma.category.create({
    data: { name: parsed.data.name },
  });

  await logActivity(prisma, {
    action: "CATEGORY_CREATE",
    entityType: "Category",
    entityId: created.id,
    actorId: session.user.id,
    description: `Created category ${created.name}`,
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
    const existing = await prisma.category.findUnique({ where: { id } });
    await prisma.category.delete({ where: { id } });
    await logActivity(prisma, {
      action: "CATEGORY_DELETE",
      entityType: "Category",
      entityId: id,
      actorId: session.user.id,
      description: `Deleted category ${existing?.name ?? id}`,
    });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Category is in use or not found" }, { status: 400 });
  }
}
