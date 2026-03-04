import { z } from "zod";

export const upsertRoleRequestDTOSchema = z
  .object({
    name: z.string().trim().min(3).max(80),
    description: z.string().trim().max(240).optional(),
    permissionCodes: z.array(z.string().min(1)).min(1),
    clonedFromRoleId: z.string().trim().min(1).optional(),
  })
  .strict();
