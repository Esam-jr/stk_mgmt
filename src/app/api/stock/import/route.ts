import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { Prisma } from "@prisma/client";
import { z } from "zod";

async function generateThreeDigitBarcode(tx: Prisma.TransactionClient): Promise<string> {
  for (let attempts = 0; attempts < 50; attempts += 1) {
    const candidate = String(100 + Math.floor(Math.random() * 900));
    const exists = await tx.productVariant.findUnique({ where: { barcode: candidate } });
    if (!exists) return candidate;
  }
  throw new Error("Unable to generate unique 3-digit stock code");
}

const importItemSchema = z
  .object({
    name: z.string().min(1),
    brandId: z.string().min(1),
    categoryId: z.string().min(1),
    size: z.string().min(1),
    color: z.string().optional().nullable(),
    quantity: z.coerce.number().int().min(0),
    priceIn: z.coerce.number().positive(),
    sellingPrice: z.coerce.number().positive(),
    branchId: z.string().min(1),
    barcode: z.string().regex(/^\d{3}$/, "Code must be exactly 3 digits").optional().nullable(),
  })
  .refine((data) => data.sellingPrice > data.priceIn, {
    path: ["sellingPrice"],
    message: "Sell price must be higher than buy price",
  });

const importSchema = z.object({
  items: z.array(importItemSchema).min(1).max(500),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "MAIN_ADMIN" && role !== "SUPER_ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const result = await prisma.$transaction(async (tx) => {
    let created = 0;
    let updated = 0;

    for (const item of parsed.data.items) {
      const product =
        (await tx.product.findFirst({
          where: {
            name: item.name,
            brandId: item.brandId,
            categoryId: item.categoryId,
            branchId: item.branchId,
          },
        })) ??
        (await tx.product.create({
          data: {
            name: item.name,
            brandId: item.brandId,
            categoryId: item.categoryId,
            branchId: item.branchId,
            priceIn: item.priceIn,
            sellingPrice: item.sellingPrice,
          },
        }));

      await tx.product.update({
        where: { id: product.id },
        data: {
          priceIn: item.priceIn,
          sellingPrice: item.sellingPrice,
        },
      });

      const existingVariant = item.barcode
        ? await tx.productVariant.findUnique({ where: { barcode: item.barcode } })
        : await tx.productVariant.findFirst({
            where: {
              productId: product.id,
              size: item.size,
              color: item.color || null,
            },
          });

      const variant = existingVariant
        ? await tx.productVariant.update({
            where: { id: existingVariant.id },
            data: {
              size: item.size,
              color: item.color || null,
              quantity: item.quantity,
              isActive: true,
            },
            include: { product: { include: { brand: true } } },
          })
        : await tx.productVariant.create({
            data: {
              productId: product.id,
              size: item.size,
              color: item.color || null,
              quantity: item.quantity,
              barcode: item.barcode || (await generateThreeDigitBarcode(tx)),
            },
            include: { product: { include: { brand: true } } },
          });

      if (existingVariant) updated += 1;
      else created += 1;

      await logActivity(tx, {
        action: existingVariant ? "STOCK_UPDATE" : "STOCK_CREATE",
        entityType: "ProductVariant",
        entityId: variant.id,
        actorId: session.user.id,
        description: `${existingVariant ? "Imported update for" : "Imported"} stock variant ${variant.product.brand.name} ${variant.product.name} (${variant.size}${variant.color ? `/${variant.color}` : ""})`,
        metadata: {
          branchId: item.branchId,
          quantity: variant.quantity,
        },
      });
    }

    return { created, updated };
  });

  return Response.json(result);
}
