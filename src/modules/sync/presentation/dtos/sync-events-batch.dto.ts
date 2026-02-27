import { z } from "zod";

export const syncEventInputDTOSchema = z.object({
  eventId: z.string().min(1),
  eventType: z.string().min(1),
  occurredAt: z.string().datetime(),
  payload: z.record(z.string(), z.unknown()),
  idempotencyKey: z.string().min(1),
}).strict();

export const syncEventsBatchDTOSchema = z.object({
  events: z.array(syncEventInputDTOSchema).min(1),
}).strict();

export type SyncEventInputDTO = z.infer<typeof syncEventInputDTOSchema>;
export type SyncEventsBatchDTO = z.infer<typeof syncEventsBatchDTOSchema>;
