import { Prisma, PrismaClient } from "@prisma/client";

type ActivityDb = PrismaClient | Prisma.TransactionClient;

type LogActivityInput = {
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  actorId?: string;
  metadata?: Prisma.JsonObject;
};

export async function logActivity(db: ActivityDb, input: LogActivityInput) {
  await db.activityLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      description: input.description,
      actorId: input.actorId,
      metadata: input.metadata,
    },
  });
}
