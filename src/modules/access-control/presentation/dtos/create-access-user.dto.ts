import { z } from "zod";

export const createAccessUserRequestDTOSchema = z
  .object({
    displayName: z.string().trim().min(3).max(120),
    actorKind: z.enum(["human", "system"]).default("human"),
    roleIds: z.array(z.string().min(1)).default([]),
  })
  .strict();
