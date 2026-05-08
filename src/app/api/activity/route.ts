import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "SUPER_ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = request.nextUrl;
  const limitRaw = Number(searchParams.get("limit") ?? "50");
  const offsetRaw = Number(searchParams.get("offset") ?? "0");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;
  const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

  const createdAt: { gte?: Date; lte?: Date } = {};
  if (from) {
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    if (!Number.isNaN(fromDate.getTime())) createdAt.gte = fromDate;
  }
  if (to) {
    const toDate = new Date(`${to}T23:59:59.999Z`);
    if (!Number.isNaN(toDate.getTime())) createdAt.lte = toDate;
  }

  const where = Object.keys(createdAt).length > 0 ? { createdAt } : undefined;

  const [activities, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.activityLog.count({ where }),
  ]);

  return Response.json({
    items: activities,
    total,
    limit,
    offset,
  });
}
