import { z } from "zod";

export const selectableActorResponseItemDTOSchema = z
  .object({
    actorId: z.string().min(1),
    displayName: z.string().min(1),
    roleCodes: z.array(z.string().min(1)),
    roleNames: z.array(z.string().min(1)),
    assignedRegisterIds: z.array(z.string().min(1)),
  })
  .strict();

export const selectableActorsResponseDTOSchema = z
  .object({
    items: z.array(selectableActorResponseItemDTOSchema),
  })
  .strict();
