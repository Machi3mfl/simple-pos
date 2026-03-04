import { z } from "zod";

export const upsertUserAuthCredentialsRequestDTOSchema = z
  .object({
    email: z.string().trim().email().max(254),
    password: z.string().trim().min(8).max(128),
  })
  .strict();

export const userAuthCredentialsResponseDTOSchema = z
  .object({
    userId: z.string().min(1),
    displayName: z.string().min(1),
    authUserId: z.string().uuid(),
    authEmail: z.string().email(),
    wasCreated: z.boolean(),
  })
  .strict();
