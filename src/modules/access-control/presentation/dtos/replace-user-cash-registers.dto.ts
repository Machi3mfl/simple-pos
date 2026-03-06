import { z } from "zod";

export const replaceUserCashRegistersRequestDTOSchema = z
  .object({
    cashRegisterIds: z.array(z.string().min(1)).max(100),
  })
  .strict();

