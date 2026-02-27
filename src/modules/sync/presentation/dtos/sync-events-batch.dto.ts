export interface SyncEventInputDTO {
  readonly eventId: string;
  readonly eventType: string;
  readonly occurredAt: string;
  readonly payload: Record<string, unknown>;
  readonly idempotencyKey: string;
}

export interface SyncEventsBatchDTO {
  readonly events: SyncEventInputDTO[];
}
