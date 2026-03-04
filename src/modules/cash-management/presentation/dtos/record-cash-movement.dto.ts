import { z } from "zod";

export const recordCashMovementDTOSchema = z
  .object({
    movementType: z.enum(["cash_paid_in", "cash_paid_out", "safe_drop", "adjustment"]),
    amount: z.number().finite().positive(),
    direction: z.enum(["inbound", "outbound"]).optional(),
    notes: z.string().trim().max(240).optional(),
  })
  .superRefine((value, context) => {
    if (value.movementType === "adjustment" && !value.direction) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["direction"],
        message: "Para un ajuste manual debés indicar si suma o resta efectivo.",
      });
    }
  });

export type RecordCashMovementDTO = z.infer<typeof recordCashMovementDTOSchema>;
