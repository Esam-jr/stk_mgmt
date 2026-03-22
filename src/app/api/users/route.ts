import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

const createUserSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["SUPER_ADMIN", "MAIN_ADMIN", "SALES"]),
  branchId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "SUPER_ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.user.findMany({
    include: { branch: true },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(users.map((u: any) => ({ ...u, password: undefined })));
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "SUPER_ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const { firstName, lastName, email, password, role: userRole, branchId } = parsed.data;
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { firstName, lastName, email, password: hashedPassword, role: userRole, branchId },
    include: { branch: true },
  });
  return Response.json({ ...user, password: undefined }, { status: 201 });
}
