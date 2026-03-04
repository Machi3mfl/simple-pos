import { z } from "zod";

export const replaceUserRolesRequestDTOSchema = z
  .object({
    roleIds: z.array(z.string().min(1)),
  })
  .strict();
