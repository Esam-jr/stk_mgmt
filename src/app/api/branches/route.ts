import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const branchSchema = z.object({
  name: z.string().min(1),
  location: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const branches = await prisma.branch.findMany({ orderBy: { createdAt: "desc" } });
  return Response.json(branches);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "SUPER_ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = branchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const branch = await prisma.branch.create({ data: parsed.data });
  return Response.json(branch, { status: 201 });
}
