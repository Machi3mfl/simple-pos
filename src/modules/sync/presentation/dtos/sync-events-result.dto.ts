import { z } from "zod";

export const syncEventResultStatusSchema = z.enum(["synced", "failed"]);
export type SyncEventResultStatusDTO = z.infer<typeof syncEventResultStatusSchema>;

export const syncEventResultDTOSchema = z.object({
  eventId: z.string().min(1),
  status: syncEventResultStatusSchema,
  reason: z.string().min(1).optional(),
}).strict();

export const syncEventsResultResponseDTOSchema = z.object({
  results: z.array(syncEventResultDTOSchema).min(1),
}).strict();

export type SyncEventResultDTO = z.infer<typeof syncEventResultDTOSchema>;
export type SyncEventsResultResponseDTO = z.infer<
  typeof syncEventsResultResponseDTOSchema
>;
