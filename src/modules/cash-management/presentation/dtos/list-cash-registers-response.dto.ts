import { z } from "zod";

import { cashRegisterSessionResponseDTOSchema } from "./cash-register-session-response.dto";

export const cashRegisterListItemDTOSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    locationCode: z.string().min(1).optional(),
    isActive: z.boolean(),
    activeSession: cashRegisterSessionResponseDTOSchema.nullable(),
  })
  .strict();

export const listCashRegistersResponseDTOSchema = z
  .object({
    items: z.array(cashRegisterListItemDTOSchema),
  })
  .strict();
