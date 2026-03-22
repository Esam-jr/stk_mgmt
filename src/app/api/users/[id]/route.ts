import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { hashPassword } from "better-auth/crypto";

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional().or(z.literal("")),
  role: z.enum(["SUPER_ADMIN", "MAIN_ADMIN", "SALES"]).optional(),
  branchId: z.string().nullable().optional(),
});

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "SUPER_ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const { password, ...rest } = parsed.data;
  const updateData: any = { ...rest };
  
  if (updateData.role && updateData.role !== "SALES") {
    updateData.branchId = null;
  }

  let hashedPassword = undefined;
  if (password && password.length >= 6) {
    hashedPassword = await hashPassword(password);
    updateData.password = hashedPassword;
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { branch: true },
    });
    
    // Also update Better Auth account password if provided
    if (hashedPassword) {
      const account = await prisma.account.findFirst({ where: { userId: id, providerId: "credential" } });
      if (account) {
          await prisma.account.update({
              where: { id: account.id },
              data: { password: hashedPassword }
          });
      }
    }

    return Response.json({ ...user, password: undefined });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "SUPER_ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

  try {
    // Relying on onDelete: Cascade to delete Account and Sessions. 
    // Prisma will delete them if schema is set up with onDelete: Cascade
    await prisma.user.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
