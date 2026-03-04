import { z } from "zod";

export const assumeUserSessionRequestDTOSchema = z
  .object({
    userId: z.string().min(1),
  })
  .strict();

export const assumeUserSessionResponseDTOSchema = z
  .object({
    actorId: z.string().min(1),
    displayName: z.string().min(1),
    roleCodes: z.array(z.string().min(1)),
    roleNames: z.array(z.string().min(1)),
    assignedRegisterIds: z.array(z.string().min(1)),
  })
  .strict();
