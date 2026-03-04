import { z } from "zod";

import type { RecordCashMovementUseCase } from "@/modules/cash-management/application/use-cases/RecordCashMovementUseCase";

import type { SyncEventProcessor } from "../../application/services/SyncEventProcessor";
import type { ProcessSyncEventInput } from "../../application/use-cases/ProcessSyncEventsBatchUseCase";

const cashMovementSyncEventPayloadSchema = z
  .object({
    sessionId: z.string().min(1),
    actorId: z.string().min(1),
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

export class CashMovementSyncEventProcessor implements SyncEventProcessor {
  constructor(
    private readonly recordCashMovementUseCase: RecordCashMovementUseCase,
  ) {}

  supports(eventType: string): boolean {
    return eventType === "cash_movement_recorded";
  }

  async process(event: ProcessSyncEventInput): Promise<void> {
    const parsedPayload = cashMovementSyncEventPayloadSchema.safeParse(event.payload);
    if (!parsedPayload.success) {
      throw new Error("invalid_cash_movement_payload");
    }

    await this.recordCashMovementUseCase.execute({
      sessionId: parsedPayload.data.sessionId,
      movementType: parsedPayload.data.movementType,
      amount: parsedPayload.data.amount,
      direction: parsedPayload.data.direction,
      notes: parsedPayload.data.notes,
      actorId: parsedPayload.data.actorId,
    });
  }
}
