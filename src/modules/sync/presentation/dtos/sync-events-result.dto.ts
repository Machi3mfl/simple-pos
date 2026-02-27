export type SyncEventResultStatusDTO = "synced" | "failed";

export interface SyncEventResultDTO {
  readonly eventId: string;
  readonly status: SyncEventResultStatusDTO;
  readonly reason?: string;
}

export interface SyncEventsResultResponseDTO {
  readonly results: SyncEventResultDTO[];
}
